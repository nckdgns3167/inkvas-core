# ADR-0018: 태블릿 입력·성능 표준 — Pointer Events + S Pen 압력 + 핀치/2손가락 pan + 60fps 상시 게이트

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: B4 (태블릿 60fps), B5 (long-task 0)
- Related ADRs: ADR-0005 (어노 엔진 — 입력 → op 생성 경로), ADR-0006 (Worker pool — 입력 응답성), ADR-0007 (Eraser), ADR-0010 (a11y — 키보드 등가)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §"필수 환경 제약"

> **사용자 명시 환경 제약 (불변)**: PC 브라우저 + **태블릿** (Galaxy Tab S9 FE+ 동등) — pan & zoom 60fps 깨끗 동작. 손가락 핀치 + 2손가락 pan + S Pen 동시 지원. **태블릿 회귀 0 가 Gate** (Phase 3+ 상시).
>
> 옛 viewer 참조 (`inkvas-legacy-assets/pdf_viewer_svelte/src/lib/interaction/viewPinchZoom.svelte.ts`): 알고리즘 *참조만*, 재작성 (A2 legacy 격리).

## Context

Inkvas 의 사용자 환경 제약은 *대다수 PDF 어노 도구의 사각 영역* 인 **태블릿 60fps** 동시 만족.

요구 입력 종 (Pointer Events spec 통합):
- **마우스** (`pointerType: 'mouse'`) — PC 환경
- **터치** (`pointerType: 'touch'`) — 손가락 입력 (핀치 zoom + 2손가락 pan)
- **펜** (`pointerType: 'pen'`) — S Pen (압력 + 기울기 + 호버)

동시 발생 시나리오:
1. **2손가락 핀치 zoom** — touch 2 개 + 거리 변화
2. **2손가락 pan** — touch 2 개 + 거리 변화 작음 + 평행 이동
3. **S Pen 그리기** — pen 1 개 + 압력
4. **S Pen 그리기 중 손바닥 거치** — pen 1 + touch 다수 (palm rejection)
5. **마우스 + 키보드** — PC 환경, shortcut

## Decision

**Pointer Events spec 전용 사용 (touch/mouse events 폐기) + S Pen 압력·기울기 활용 + gesture engine (핀치 / 2손가락 pan 구분) + palm rejection heuristic + FLIP animation 패턴 + GPU compositor layer**.

### 1. Pointer Events 표준만

```ts
// 메인 입력 이벤트 — Pointer Events spec
element.addEventListener('pointerdown', handler);
element.addEventListener('pointermove', handler);
element.addEventListener('pointerup', handler);

// touch-action: none — 브라우저 기본 핀치/pan 제스처 차단 (자체 구현으로 대체)
element.style.touchAction = 'none';

// 이벤트 객체 핵심 필드
type PointerEvent = {
  pointerId: number;        // 멀티 터치 추적
  pointerType: 'mouse' | 'touch' | 'pen';
  pressure: number;         // 0..1 (S Pen 압력)
  tiltX: number;            // S Pen 기울기 X
  tiltY: number;            // S Pen 기울기 Y
  width: number;            // 터치 접촉 영역 (palm rejection)
  height: number;
  clientX, clientY: number;
  // ...
};
```

`touch-action: none` 으로 브라우저 기본 핀치/pan 제스처 *완전 차단*. Inkvas 가 *모든 제스처 직접 처리*.

### 2. Gesture engine — pointer cluster 추적

```ts
class GestureEngine {
  activePointers: Map<pointerId, PointerState>;

  onPointerDown(e: PointerEvent) {
    this.activePointers.set(e.pointerId, { type: e.pointerType, x, y, pressure, ... });
    this.dispatch();
  }

  dispatch() {
    const pens = this.filterByType('pen');
    const touches = this.filterByType('touch');

    // palm rejection: pen + touch 동시 시 touch 무시
    if (pens.length >= 1 && touches.length > 0) {
      this.suppressTouches = true;
    }

    // S Pen 입력
    if (pens.length === 1 && !this.suppressTouches /* 항상 우선 */) {
      this.handlePenStroke(pens[0]);
      return;
    }

    // 2손가락 제스처
    if (touches.length === 2 && !this.suppressTouches) {
      this.handleTwoFingerGesture(touches);
      return;
    }

    // 1손가락 = 선택 또는 단일 stroke (mode 따라)
    if (touches.length === 1) {
      this.handleSingleTouch(touches[0]);
    }
  }

  handleTwoFingerGesture(touches: [PointerState, PointerState]) {
    const initial = this.twoFingerInitial;
    const dist0 = distance(initial[0], initial[1]);
    const dist1 = distance(touches[0], touches[1]);
    const center0 = midpoint(initial[0], initial[1]);
    const center1 = midpoint(touches[0], touches[1]);
    const scaleFactor = dist1 / dist0;
    const panDelta = { x: center1.x - center0.x, y: center1.y - center0.y };

    // 거리 변화율 |Δ| > threshold → pinch zoom
    // 그 외 → pan
    if (Math.abs(scaleFactor - 1) > 0.05) {
      this.applyZoom(scaleFactor, center1);  // FLIP pattern
    }
    this.applyPan(panDelta);
  }
}
```

### 3. S Pen 압력 → stroke width

```ts
function strokeWidthFromPressure(basePressure: number, baseWidth: number): number {
  // 압력 곡선 (선형 또는 ease) — 사용자 설정 가능
  return baseWidth * (0.3 + 0.7 * basePressure);  // 0.3x ~ 1.0x range
}
```

S Pen 압력은 stroke 의 *segment 마다 다른 width* (테이퍼 효과) — 자연스러운 잉크 메타포.

### 4. Palm rejection heuristic

```ts
// pen 입력 시작 후 1초 내, 또는 동시 발생하는 touch 무시
// + touch.width × touch.height > 36×36 (Apple HIG 보다 큰 접촉) 무시
const isPalm = (touch: PointerState) =>
  this.recentPenActivity || touch.width * touch.height > 1296;
```

검증: 사용자가 펜 들고 손바닥 거치한 채 작업 — palm 으로 인한 *잘못된 stroke* 0건.

### 5. FLIP animation 패턴 (zoom/pan 60fps)

```
[F]irst — 현재 상태 측정 (transform: scale(1) translate(0,0))
[L]ast — 목표 상태 측정 (transform: scale(1.5) translate(...))
[I]nvert — 목표 - 현재 = 차이 transform 계산
[P]lay — CSS transition 또는 requestAnimationFrame 으로 차이 transform 0 으로 줄임
```

브라우저가 *transform 만* 변경 시 GPU compositor layer 로 합성 — *layout/paint* 단계 건너뜀 → 60fps 보장.

### 6. GPU compositor layer 강제

```css
.inkvas-canvas-container {
  will-change: transform;        /* 컴포지터 promote */
  transform: translate3d(0,0,0); /* 명시적 GPU layer */
  contain: layout style paint;   /* containment 최적화 */
}
```

### 7. Galaxy Tab S9 FE+ 동등 기기 *Phase 3+ 상시 게이트*

- 매 Phase Gate (G3~G7) 에서 *실 기기* 또는 *동등 사양 emulator* 검증
- 핀치 zoom 0.5~5x (초점 보정) 60fps 깨끗
- 2손가락 pan 60fps
- S Pen 압력 인식 + 손바닥 거치 동시
- 회전·zoom 시 자유캔버스 좌표 회귀 0 (USP-4)

## Alternatives Considered

### (a) touch / mouse events 별개

- Pros: 옛 브라우저 호환
- Cons (결정적): 멀티 입력 (pen + touch + mouse) 의 *동시 처리* 가 코드 폭발. Pointer Events 가 spec 의 *지원 권장* 표준.

### (b) HammerJS / Interactjs 등 외부 gesture 라이브러리

- Pros: 검증된 gesture 추출
- Cons: palm rejection 같은 *Inkvas 특화 로직* 추가가 어색. Library 빌드 크기 (~30KB).

### (c) Pointer Events + 자체 gesture engine ← **채택**

- Pros: 100% 표준 + Inkvas 특화 로직 (palm rejection, S Pen 압력 → width) 자연 통합
- Cons: 직접 구현 시간 (~3 day) — AI 에이전트 boost + 옛 viewer `viewPinchZoom` 알고리즘 *참조*

## Consequences

### 직접 박힘

- `packages/core/src/input/gesture-engine.ts` — GestureEngine 클래스
- `packages/core/src/input/palm-rejection.ts`
- `packages/core/src/input/flip-animation.ts`
- AGENTS.md §6.1 — *입력·렌더링·좌표계* 닿는 변경은 태블릿 게이트 검증 의무 박힘

### Phase 매핑

- **Phase 3 (Render a PDF)** — 핀치 zoom + 2손가락 pan + 60fps 게이트 *첫 활성*
- **Phase 4 (Annotation MVP)** — S Pen 압력 + palm rejection + 자유캔버스 좌표 게이트 추가
- **Phase 5+** — 모든 PR 에서 태블릿 회귀 0 검증

### Trade-off

- 브라우저 minimum 상향: **Chromium 90+ / Safari 16.4+ (Pointer Events + OffscreenCanvas)**.
- Galaxy Tab S9 FE+ 동등 기기 또는 emulator 보유 부담 — 사용자가 *실 기기* 확보 권장.

### Risk class

**critical** — 본 ADR 변경은 *모든 입력 경로* 영향. 입력 layer 의 모든 컴포넌트 재검증.

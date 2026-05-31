# ADR-0005: Annotation Engine + Infinite Canvas 좌표계 — Custom Canvas + RBush spatial index + immutable stroke entities

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: B4 (태블릿 60fps), B5 (long-task 0), B6 (memory), C7 (hash chain), C8 (영속), E16 (CRDT round-trip), USP-4 자유 캔버스
- Related ADRs: ADR-0004 (PDF 렌더 — 4 layer canvas 정합), ADR-0006 (Worker pool), ADR-0007 (Eraser), ADR-0008 (Persistence/CRDT), ADR-0017 (위변조 hash chain), ADR-0018 (태블릿 입력)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §Phase 2 ADR-0005 (USP-4 코어)

> **bootstrap.md 명시: "ADR-0005 (어노) 는 ADR-0006 (Worker) + ADR-0007 (Eraser) + ADR-0018 (태블릿) 와 *동시 결정*. paper.js 부채 재발 + 태블릿 60fps 동시 만족 가능한 엔진 선택."** 본 Group 2 4 ADR 의 *상위 입력*.

## Context

옛 viewer 부채 인용 (5종 중 본 ADR 직접 관련):
- **paper.js 메인스레드 직렬화** — paper.js 의 Item / Path / Group 객체가 단일 메인스레드 scene graph. 1000+ stroke 시 렌더가 메인스레드 점유 → B4 (태블릿 60fps) + B5 (long-task 0) 동시 실패.
- **단편 prop 폭발** — paper.js 객체가 *내부 상태 변경* 식 mutation API. CRDT op 직렬화 어려움 (E16). 옛 viewer 가 paper.js + 자체 JSON 직렬화 layer 를 *변환마다 재구성* → 메모리 + CPU 폭발.

USP-4 (자유 캔버스 — 페이지 외부 좌표) 요구:
- 단일 *world coord* 평면 (float64). PDF 페이지 = 이 평면 위의 *고정 transform* 으로 박힌 영역.
- 모든 stroke 은 world coord 또는 page-local coord (page transform 결합 가능) 중 *명시적* 선택.
- 페이지 회전·zoom 시 page-local coord 의 world coord 변환만 갱신 — 데이터 자체는 불변.

E16/C7 요구 (CRDT + hash chain 양립):
- 어노 entity 가 *JSON-serializable + 불변 (immutable)* — `{ id, type, points, style, layer, anchor }` 같은 평면 객체.
- CRDT op (`add`/`update`/`remove`) 가 entity 의 *전체 상태* 또는 *덧셈 변경* 로 표현.
- 모든 op 가 hash chain 의 input — *순서 결정적*.

## Decision

**Custom Canvas (HTML5 Canvas / OffscreenCanvas) + RBush spatial index + immutable stroke entity model + world coord float64**.

### 1. World coord 평면

```ts
// 모든 어노 entity 의 좌표는 world coord (float64)
type WorldPoint = { x: number; y: number };  // float64 — IEEE 754 double

// PDF 페이지 = world coord 위의 고정 transform 으로 박힌 box
type PageAnchor = {
  pageIndex: number;
  pageWidth: number;   // PDF native size (points, 1pt = 1/72 inch)
  pageHeight: number;
  transform: { translateX: number; translateY: number; rotate: 0|90|180|270 };
  // page-local (0..pageWidth) ↔ world coord 변환은 transform 으로 derive
};

// 어노 anchor 분류
type Anchor =
  | { kind: 'page'; pageIndex: number; localPoint: WorldPoint }  // page-local coord (페이지 회전 시 자동 변환)
  | { kind: 'free'; worldPoint: WorldPoint };                     // free canvas — USP-4 코어
```

페이지 회전·zoom 은 `PageAnchor.transform` 만 갱신. 모든 page-anchored entity 의 world coord 는 transform 으로 *실시간 derive*. 데이터 자체는 *불변*.

### 2. Immutable stroke entity

```ts
// stroke = 펜·형광펜의 점 시퀀스
type Stroke = {
  id: string;           // ULID — CRDT op 의 unique key
  kind: 'stroke';
  tool: 'pen' | 'highlighter' | 'eraser-mark';  // eraser 는 별도 — ADR-0007
  anchor: Anchor;       // page 또는 free
  points: Array<[x: number, y: number, pressure: number, t: number]>;
                        // anchor 좌표계 기준 (page-local 또는 world)
                        // pressure = 0..1 (S Pen 압력, ADR-0018)
                        // t = ms timestamp (재생·undo 순서 결정)
  style: {
    color: string;      // CSS color
    width: number;      // base width (압력에 곱)
    opacity: number;
  };
  layer: 'over' | 'under';   // PDF 위 / 아래 (USP-4 자유 캔버스의 z-order)
  authorId: string;     // RBAC — USP-2 (ADR-0019)
  ts: { created: number; updated: number };
};

// 도형·텍스트·sticky note 도 동일 패턴 (Shape, TextBox, Note 등)
type Shape = { ... };
type TextBox = { ... };
type Note = { ... };

type Entity = Stroke | Shape | TextBox | Note;
```

**불변 원칙**: entity 는 *변경 불가*. "변경" 은 *새 entity 만들기* + *옛 entity 제거* op (CRDT). undo/redo 는 op stack 의 inverse.

### 3. Spatial index (RBush)

- 가시 영역 query: `O(log N)` (vs paper.js 의 linear scan)
- Eraser hit-test: ADR-0007 의 핵심 — 본 ADR 에서 *제공 보장* 만, 알고리즘은 ADR-0007.
- bbox 캐시: stroke 의 bbox 는 entity 생성 시 계산, RBush 에 삽입. 페이지 회전 시 bbox transform.

### 4. Render pipeline

```
사용자 입력 (Pointer event, ADR-0018)
   ↓
op 생성 (예: AddStroke{id, anchor, points...})
   ↓
CRDT doc 에 op 적용 (ADR-0008)
   ↓
Hash chain 에 op 의 hash append (C7, ADR-0017)
   ↓
RBush insert / update
   ↓
가시 영역 entity 목록 query (O(log N))
   ↓
OffscreenCanvas worker 에 render request (ADR-0006)
   ↓
Worker 가 entity → canvas 명령 시퀀스 변환 + 렌더
   ↓
transferControlToOffscreen 한 onscreen canvas 에 합성 (commit)
```

메인스레드는 *op 생성 + RBush update + worker 메시지 큐* 만 담당. 실제 픽셀 그리기는 worker.

### 5. 4 layer canvas 구조 (ADR-0004 와 정합)

```
[3] Annotation overlay canvas (이 ADR 범위)
[2] PDF text layer (selectable, from pdf.js)
[1] PDF page canvas (pdf.js render)
[0] Infinite canvas background (free coord 영역, ADR-0005 USP-4)
```

Layer [3] 이 본 ADR. Layer [0] 은 layer [3] 의 *backdrop* (격자 패턴, 잉크 메타포 시각). [0] + [3] 이 *연속 평면* — page anchor 든 free anchor 든 한 평면에서 렌더.

### 6. Selection + transform (PowerPoint 식 resize)

- 단일/다중 선택: lasso 또는 단일 click
- 선택 box: 8 handle (resize) + 회전 handle
- 회전 인식 좌표변환: 회전된 stroke 의 회전 행렬을 stroke.points 에 *불변 변환* 후 새 entity 생성 (옛 entity 제거 op + 새 entity 추가 op — CRDT atomic)
- 옛 viewer `selectionResize.svelte.ts` 알고리즘 *참조* (legacy 격리 A2 — 코드 재작성, 알고리즘만 학습)

## Alternatives Considered

### (a) paper.js (옛 viewer)

- Cons (결정적): 메인스레드 부채 직접 재발 + CRDT 직렬화 어려움 + 객체 mutation API 가 hash chain (immutable op) 와 충돌. **본 plan 의 차단 항목.**

### (b) Konva

- Pros: Stage/Layer 모델 익숙, 성숙 라이브러리, infinite canvas 지원 (Stage transform)
- Cons:
  - 객체 mutation API (`shape.x(100)`) — CRDT op 직렬화 추가 layer 필요
  - OffscreenCanvas 부분 지원 (Konva 9+ 일부, full Worker 지원 X)
  - 객체 lifecycle 관리가 RBush + immutable entity 패턴과 *중복* → 둘 중 하나 사실상 무효화
  - 런타임 ~100KB (gzip), B6 메모리 부담

### (c) Fabric.js

- Pros: 가장 큰 생태계 (어노 도구 reference)
- Cons (결정적): Konva 와 동일 단점 + 객체지향 무게가 훨씬 더 큼. CRDT 와 가장 충돌.

### (d) SVG 기반 (D3 등)

- Pros: 텍스트·도형 native, accessibility 우수
- Cons: 1000+ stroke 렌더 성능 ✕ (DOM 노드 폭발). 60fps 미달.

### (e) Custom Canvas + 자체 spatial index + immutable entity ← **채택**

위 (a)~(d) 의 trade-off — *(e) 만이 4 ADR (0005/0006/0007/0018) 동시 만족*.

### 비교

| 기준 | (a) paper.js | (b) Konva | (c) Fabric | (d) SVG | **(e) Custom (채택)** |
|---|---|---|---|---|---|
| B4 태블릿 60fps (1000+ stroke) | ✕ (부채) | △ | ✕ | ✕ | **◯** (Worker offload) |
| B5 long-task 0 | ✕ | △ | ✕ | △ | **◯** |
| B6 memory (큰 stroke) | △ | △ (~100KB) | ✕ | ✕ (DOM 폭발) | **◯** (minimal) |
| C7 hash chain 호환 (immutable op) | ✕ (mutation) | ✕ (mutation) | ✕ | ◯ | **◯** |
| E16 CRDT round-trip | ✕ (mutation) | △ | △ | ◯ | **◯** |
| USP-4 자유 캔버스 (페이지 외부 coord) | △ (수동) | ◯ (Stage transform) | ◯ | ✕ | **◯** (world coord) |
| 옛 viewer 부채 재발 회피 | ✕ | △ | △ | ◯ | **◯** |
| 솔로 dev 구현 부담 | △ (기존 자산) | ◯ | ◯ | ◯ | ✕ (직접 구현) |
| AI 에이전트 친화 | △ | ◯ | ◯ | ◯ | △ (직접 작성 가이드 필요) |

→ **(e) 채택**. 구현 부담은 *AI 에이전트가 직접 작성* + RBush 라이브러리 (스몰, 검증된) 로 boost.

## Consequences

### 직접 박힘

- `packages/core/src/annotation/entity.ts` — Entity type 정의 (Stroke / Shape / TextBox / Note + Anchor)
- `packages/core/src/annotation/anchor.ts` — Page/Free anchor 변환 (world coord ↔ page-local coord)
- `packages/core/src/annotation/spatial-index.ts` — RBush wrapper (insert / remove / query / nearest)
- `packages/core/src/annotation/render-pipeline.ts` — 메인 ↔ worker 메시지 큐
- `packages/core/package.json` deps: `rbush` (^4.0), `ulid` (^2.4), `lit` (이미 ADR-0003)
- AGENTS.md §6.1 컴포넌트 작업 패턴 — 어노 컴포넌트는 *immutable entity + op 생성* 패턴, mutation API 금지

### Phase 4 자유 캔버스 게이트 (USP-4)

- 페이지 외부 좌표 (free anchor) stroke 저장·복원·undo·redo 100% 정상
- 페이지 회전·zoom 시 free anchor stroke 좌표 회귀 0
- 자유캔버스 영역 1000+ stroke 60fps (PC + 태블릿)
- 자유캔버스 영역이 USP-5 (영속성) 에 그대로 영속화

### Trade-off

- Custom Canvas + spatial index 직접 구현 = 솔로 dev 시간 투자. 대응: AI 에이전트가 RBush 표준 패턴으로 boost + 옛 viewer 알고리즘 *참조* (재작성 정책).
- Konva/Fabric 의 *built-in 도구 (resize handle, drag, lasso)* 는 *직접 구현* — 5~10 day 작업. 대응: Phase 4 의 *재현 필수 UX* 항목으로 박힘.

### Risk class

**critical** — 본 ADR 변경 시 모든 어노 entity 마이그레이션. Phase 3+ 데이터 호환성 영향 거대.

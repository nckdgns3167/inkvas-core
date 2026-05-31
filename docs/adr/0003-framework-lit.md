# ADR-0003: Framework — Lit (Web Components 표준 채택)

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: A1 (Apache-2.0 invariance, OSS 친화 라이선스), B5 (long-task 0)
- Related ADRs: ADR-0009 (Host integration — 본 ADR 의 *상위 입력*), ADR-0005 (어노 엔진), ADR-0010 (a11y)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §Phase 2 "ADR-0003 (프레임워크) 는 ADR-0009 (호스트 통합) 이후에 결정"

> bootstrap.md 명시: *"기존 스택 (Svelte 5 / paper.js / pdf.js 등) 채택 금지 — 다시 비교 후 ADR 로 결정."* 본 ADR 은 옛 viewer 의 Svelte 5 채택을 *그대로 잇지 않고* 4 후보를 명시적 비교.

## Context

ADR-0009 가 *Web Component (`<inkvas-viewer>`) 가 단일 진입점* 결정. 본 ADR 은 *그 Web Component 를 만드는 내부 프레임워크* 를 결정.

내부 프레임워크 후보 (bootstrap.md §Phase 2 ADR-0003 명시):
- **Svelte 5** (옛 viewer 가 사용) — rune-based fine-grained reactivity
- **React** — 가장 큰 생태계, 호스트 친화
- **Lit** — Web Components 표준 네이티브, 작음 (~5KB runtime)
- **Web Components 표준 (no framework)** — `class extends HTMLElement` 직접 작성

옛 viewer 부채 인용:
- **단편 prop 조합 폭발** (ADR-0009) — Svelte 컴포넌트 prop 표면이 호스트별 N x M 폭주. 프레임워크 자체 문제가 아니라 *호스트 contract 미설계* 문제. ADR-0009 가 해결.
- **paper.js 메인스레드 직렬화** — 프레임워크와 무관. ADR-0005/0006 에서 해결.
- **텍스트 회귀** — 프레임워크와 무관. ADR-0004/0011 에서 해결.

→ 옛 viewer 의 Svelte 채택 자체에 결정적 결함은 없음. 단, ADR-0009 가 Web Components 표준 export 를 *강제* 하므로 내부 프레임워크 선택의 *기준* 이 달라짐:
1. *Web Components 컴파일 또는 호환성* 최우선
2. *작은 runtime* (B6 memory budget 의 baseline)
3. *TypeScript-first* (AI 에이전트 + 솔로 dev 유지보수)
4. *Shadow DOM 자연 fit*

## Decision

**Lit (`lit-html` + `LitElement` + decorators)** 채택.

```ts
// 예시 — packages/core/src/components/Viewer.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('inkvas-viewer')
export class InkvasViewer extends LitElement {
  @property({ type: String, attribute: 'pdf-src' }) pdfSrc = '';
  @property({ type: Boolean, attribute: 'read-only' }) readOnly = false;
  @state() private _zoom = 1;

  static styles = css`
    :host { display: block; height: 100%; --ink-paper: #fdfdfd; }
    .canvas-container { ... }
  `;

  render() {
    return html`
      <div class="canvas-container">
        <slot name="toolbar-extra"></slot>
        <!-- PDF + annotation canvas -->
      </div>
    `;
  }
}
```

### 채택 핵심 이유

1. **Web Components 네이티브** — `customElements.define` 의 *공식 추상*. 다른 프레임워크가 *호환* 한다면 Lit 는 *원본*.
2. **작음** — runtime ~5KB (gzip). B6 memory budget 의 baseline.
3. **TypeScript decorators API** — `@customElement`, `@property`, `@state`. AI 에이전트 친화 + 솔로 dev 가독성.
4. **Shadow DOM 자연 fit** — `static styles = css\`...\`` 가 Shadow DOM scoped. CSS isolation 무료.
5. **Reactive properties** — Svelte 의 rune 만큼 fine-grained 는 아니지만 `@property` + 자동 re-render. 충분.
6. **호스트 어댑터 친화** — `@lit/react`, `@lit/preact` 공식 wrapper 존재 (`packages/host-react`). Vue 는 `defineCustomElement` 또는 직접 wrap.

### 어떤 영역에서 Lit 가 부족한가 (대응)

- **상태관리 (cross-component)**: 외부 라이브러리 (Zustand / Jotai 등) 또는 *Context API* 패턴 직접 구현. Lit 도 `@lit/context` 공식 제공.
- **라우팅**: Inkvas 는 *임베드 viewer* 라 라우팅 불필요. 호스트 측 라우터에 의존.
- **SSR**: Phase 1~5 시점에 클라이언트 렌더만 필요. Lit SSR 공식 지원 (Phase 7 솔루션화 시 도입 검토).
- **테스트**: `@open-wc/testing` (Lit 친화), Vitest 호환. Phase 3+.

## Alternatives Considered

### (a) Svelte 5 (옛 viewer 와 동일)

- Pros: 컴파일 시 runtime 거의 0, rune-based fine-grained reactivity 강력, 옛 viewer 자산 재사용 가능 (단, 본 plan 은 *재작성* 원칙).
- Pros: Svelte 5 customElement 모드로 Web Components 컴파일 *가능*.
- Cons:
  - Svelte → Web Components 컴파일이 *완전 1:1 아님* — `customElement: true` 모드의 slot/event/attribute 제약. 어색한 *둘로 갈라진* DX (Svelte 컴포넌트 ≠ 출력 Web Component).
  - 생태계 *Web Components 와의 호환 도구* 가 Lit 보다 약함 (예: React 어댑터는 `svelte-react` 라이브러리 의존).
  - 본 plan 의 *재평가* 원칙 — "이전에 그랬으니까" 라는 이유로 채택 금지.

### (b) React (`react-dom` + `customElements`)

- Pros: 가장 큰 생태계, 호스트 친화 (대다수 호스트가 React), AI 친화 (학습 데이터 풍부).
- Cons (결정적):
  - React → Web Components 자연 fit 아님. `r2wc` 같은 wrapper 라이브러리 의존.
  - React DOM runtime ~40KB (gzip) — Lit 의 ~5KB 대비 8배. B6 memory budget 부담.
  - Shadow DOM 안에 React 마운트 시 portal 이슈 + 이벤트 합성 (synthetic event) 의 Shadow DOM 경계 문제 빈번.
  - JSX 컴파일 도구 (Babel/TSX) 의존.

### (c) Web Components 표준 (no framework, raw `class extends HTMLElement`)

- Pros: 의존성 0, runtime 0, 가장 작음.
- Cons (결정적):
  - Reactive property + auto re-render 직접 구현 부담. 솔로 dev 시간 낭비.
  - Template literal HTML 안전 (XSS) 직접 처리 — `lit-html` 의 무료 기능을 *재구현*.
  - 큰 컴포넌트 (어노 캔버스 + 툴바 + 사이드바) 의 lifecycle 직접 관리 — 복잡도 폭증.

### (d) Lit ← **채택**

위 (a)/(b)/(c) 의 trade-off 를 *Lit 가 가장 균형* — Web Components 자연 fit + 작은 runtime + TypeScript-first + 충분한 reactive system.

### 비교

| 기준 | (a) Svelte 5 | (b) React | (c) Vanilla WC | **(d) Lit (채택)** |
|---|---|---|---|---|
| Web Components 컴파일 자연도 | △ (customElement 제한) | △ (wrapper 의존) | ◯ | **◯** (네이티브) |
| Runtime size (B6 영향) | ◯ (~0) | ✕ (~40KB) | ◯ (0) | **◯** (~5KB) |
| Reactive property 편의 | ◯ (rune) | ◯ (hooks) | ✕ (직접) | **◯** (@property) |
| Shadow DOM 자연 fit | △ | ✕ (portal 이슈) | ◯ | **◯** |
| TypeScript-first | △ (Svelte TS 불안정) | ◯ | ◯ | **◯** (decorators) |
| 호스트 어댑터 (React 등) | △ (svelte-react) | ◯ (자기 자신) | △ | **◯** (@lit/react) |
| AI 에이전트 친화 (학습 데이터) | △ | ◯ | △ | △ (충분, 표준 syntax) |
| 옛 viewer 자산 직접 재사용 | ◯ | ✕ | ✕ | ✕ |
| bootstrap.md "재평가" 원칙 정합 | ✕ (그대로 채택 금지) | ◯ | ◯ | **◯** |

→ 8/9 기준 중 **(d) Lit 가 7승**. (a) Svelte 는 옛 자산 재사용 1승.

## Consequences

### 직접 박힘

- `packages/core/package.json` 의 dependencies: `lit`, `@lit/context` (필요 시), `@lit/task` (Phase 3+).
- `packages/host-react/package.json`: `@lit/react`.
- `packages/host-vue`: 직접 wrap 또는 `vue/define-custom-element`.
- 컴포넌트 작업 패턴 (AGENTS.md §6): 모든 컴포넌트는 `class X extends LitElement` 패턴, decorator 사용, Shadow DOM 기본.
- 빌드 도구 (Phase 3+ 결정): Vite + `lit` plugin 권장. `tsc` decorator 지원 활성 (`experimentalDecorators: true`).

### Trade-off

- 학습 자료가 React 보다 적음 — 솔로 dev 가 *공식 lit.dev* 참고 우선, AI 에이전트 컨텍스트에 `lit/decorators` import 패턴 자주 노출.
- Lit 의 reactive system 은 React/Svelte 만큼 *fine-grained* 아님 — 큰 컴포넌트 re-render 시 비효율 가능. 대응: 큰 컴포넌트는 작은 LitElement 들로 분할.
- 옛 viewer 의 Svelte 코드 *직접 재사용 불가* — 알고리즘 (`selectionResize`, `viewPinchZoom`) 만 *참조*, 재작성 (A2 legacy 격리).

### Phase 매핑

| Phase | 작업 |
|---|---|
| Phase 3 | `packages/core/src/components/Viewer.ts` — `@inkvas/core` 의 첫 LitElement. PDF 1 페이지 렌더링. |
| Phase 4 | 어노 캔버스 + 툴바 + 사이드바 LitElements. ADR-0005 어노 엔진 통합. |
| Phase 5 | 호스트 어댑터 (`@lit/react` 등) 박힘. Web Component contract 완성. |

### Risk class

**critical** — 본 ADR 변경 (예: Svelte 5 supersede) 은 *모든 컴포넌트 재작성*. supersede 시 별도 Phase plan 필수.

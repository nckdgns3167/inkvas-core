# ADR-0009: Host Integration Contract — Web Component first + postMessage cross-frame + native bridges

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: C10 (호스트 origin 검증), A1 (Apache-2.0 invariance — host adapter 도 OSS)
- Related ADRs: ADR-0003 (Framework, 본 ADR 의 *후속*), ADR-0013 (Open-core 경계)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §Phase 5 (호스트 통합 본격)
- Related USPs: 호스트 임베드는 모든 USP 의 *배포 vehicle*

> bootstrap.md §"중요 순서 함정" 인용: *"ADR-0003 (프레임워크) 는 **ADR-0009 (호스트 통합) 이후에 결정**. 임베드 호환성이 프레임워크 선택을 강제 — Web Components 표준 강력 후보."* 본 ADR 이 *상위* 결정, ADR-0003 은 *결과 정합*.

## Context

옛 viewer 부채 인용 (`inkvas-legacy-assets/pdf_viewer_svelte/src/lib/bridge/`): "**단편 prop 조합 폭발**". Svelte 5 컴포넌트가 호스트별 다른 prop 조합 (브라우저 iframe / React 부모 / Android WebView / iOS WKWebView) 을 *임시방편으로* 받다 보니 prop 표면이 N x M 폭발 — 호스트 추가 시 *모든* 통합 경로 재작성.

근본 원인: *호스트 임베드 contract 가 ADR 로 박히지 않음*. 컴포넌트가 호스트 환경을 *추상화하지 못함*.

본 ADR 의 임무: *단일 통합 계약* 으로 모든 호스트 환경 흡수. 호스트 추가는 *어댑터 추가* 만, 코어는 불변.

호스트 환경 표 (Inkvas 가 지원해야 할 임베드 모드):

| # | 호스트 환경 | 메커니즘 | 채널 |
|---|---|---|---|
| 1 | Vanilla HTML 페이지 | 직접 import (script / module) | DOM custom event + JS API |
| 2 | React 부모 컴포넌트 | 어댑터 wrapper | React props + callbacks |
| 3 | Vue / Svelte 부모 | 어댑터 wrapper | 각 프레임워크 prop binding |
| 4 | Cross-origin iframe (다른 도메인) | `<iframe src=...>` | postMessage (양방향 schema) |
| 5 | Android WebView | WebView + JavascriptInterface | window.AndroidInkvas + JS bridge |
| 6 | iOS WKWebView | WKWebView + WKScriptMessageHandler | window.webkit.messageHandlers.inkvas |
| 7 | Electron 데스크톱 (선택, Phase 5+) | preload script + contextBridge | ipcRenderer |

## Decision

### 1. **Web Component (`<inkvas-viewer>`) 가 *단일 진입점***

- HTML 표준 `customElements.define('inkvas-viewer', InkvasViewer)` 로 등록.
- Shadow DOM 안에 모든 UI + 어노 캔버스 + 툴바.
- HTML attribute → reactive property (`pdf-src`, `read-only`, `theme`, `user-id`, ...) — JS property 와 1:1.
- DOM custom event (`inkvas:open`, `inkvas:annotation`, `inkvas:save`, `inkvas:error`) — 호스트 listener.
- 슬롯 (`<slot name="toolbar-extra">`) — 호스트 정의 보조 UI 삽입 지점 (선택).

이 *Web Component contract* 가 호스트 환경 1~3 (직접 사용 / 어댑터 wrap) 의 단일 진입점.

### 2. **JS API (`window.pdfv` 또는 직접 import) — 명령형 접근**

```ts
// @inkvas/host-vanilla
import { createViewer } from '@inkvas/host-vanilla';

const viewer = createViewer(document.getElementById('mount'), {
  pdfSrc: '/doc.pdf',
  readOnly: false,
  user: { id: 'u-123', role: 'editor', name: '...' },
  onSave: async (snapshot) => { /* ... */ },
  // ...
});

viewer.open('/another.pdf');
viewer.setReadOnly(true);
viewer.dispose();
```

명령형 API 는 Web Component 의 *상위 추상* — 내부적으로는 `<inkvas-viewer>` 인스턴스 생성 + 이벤트 리스너 등록. 일관된 lifecycle.

### 3. **postMessage cross-frame protocol — 호스트 환경 4 (iframe) + 5 (Android) + 6 (iOS) 공통**

iframe / WebView 환경에서 호스트와 viewer 가 *별도 JS context* 일 때:

```ts
// 메시지 스키마 (양방향, versioned)
type InkvasMessage =
  | { v: 1; kind: 'open'; src: string; readOnly?: boolean }
  | { v: 1; kind: 'save-request' }
  | { v: 1; kind: 'save-response'; snapshot: Uint8Array; hash: string }
  | { v: 1; kind: 'annotation-add'; op: AnnotationOp }
  | { v: 1; kind: 'presence'; users: PresenceState[] }
  | { v: 1; kind: 'error'; code: string; message: string }
  // ... 약 20~30개 메시지 종 (Phase 5 확정)
```

전송 채널 매핑:

| 환경 | 호스트 → viewer | viewer → 호스트 |
|---|---|---|
| iframe | `iframe.contentWindow.postMessage(msg, origin)` | `window.parent.postMessage(msg, origin)` |
| Android WebView | `webView.evaluateJavascript("window.__inkvas_recv(msg)")` | `window.AndroidInkvas.send(JSON.stringify(msg))` (JavascriptInterface) |
| iOS WKWebView | `webView.evaluateJavaScript("window.__inkvas_recv(msg)")` | `window.webkit.messageHandlers.inkvas.postMessage(msg)` |

**C10 (호스트 origin 검증) 필수**: iframe 메시지는 `event.origin` 화이트리스트 검증 후 처리. Android/iOS bridge 는 *호스트 native 측* 에서 namespace 격리 (단일 origin 환경).

### 4. **호스트 어댑터 패키지 (모두 OSS)**

```
@inkvas/host-vanilla    # createViewer() — 직접 import (host 환경 1)
@inkvas/host-react      # <InkvasViewer/> React 컴포넌트 wrapper (host 환경 2)
@inkvas/host-vue        # <InkvasViewer/> Vue 컴포넌트 wrapper (host 환경 3)
@inkvas/host-bridge     # postMessage / Android / iOS bridge wrappers (host 환경 4/5/6)
@inkvas/protocol        # 메시지 스키마 TypeScript types + zod validator (양측 공유)
```

`@inkvas/protocol` 은 호스트 측에서도 import 가능 (npm publish). 호스트가 *타입 안전* 하게 메시지 보내고 받음.

### 5. **Contract test (Phase 5 G5 게이트)**

- Playwright + 임의 origin iframe 시뮬레이션 — 모든 메시지 종 round-trip 통과
- Android emulator (Phase 5) — JavascriptInterface 양방향 검증
- iOS simulator (Phase 5) — WKMessageHandler 양방향 검증
- 호스트 데모 3 종 (vanilla / React / Android WebView) E2E 통과

### 6. **버전 호환성**

- `v: 1` 메시지 schema 는 *영원히* 호환 (deprecate 만 가능, 삭제 불가)
- Breaking 변경은 `v: 2` 추가, viewer 가 양 버전 모두 수신 가능 (호스트 신구 양쪽 지원)
- 호스트 → viewer "handshake" 메시지로 합의된 버전 결정

## Alternatives Considered

### (a) Framework-specific component (옛 viewer 패턴)

옛 viewer 처럼 Svelte 컴포넌트로 진입점 박고 React 호스트는 wrapper 작성.

- Pros: 단일 프레임워크 일관, 내부 DX 좋음
- Cons (강함): 호스트 추가 시마다 wrapper 새로 (host N x prop M 폭발). 부채 직접 재발.

### (b) iframe-only embedding

viewer 를 *독립 페이지* 로 호스팅, 호스트는 iframe 만 임베드.

- Pros: 격리 강함, 호스트 의존 X
- Cons: React/Vue 등 *직접 컴포넌트* 통합 불가 (5번 모든 사용 사례에 iframe overhead). 단일 페이지 앱 SPA 라우팅 충돌. 모바일 WebView 의 iframe-in-WebView 중첩 성능 손해.

### (c) Micro-frontend (Module Federation 등)

Webpack Module Federation 으로 viewer 를 runtime-loaded module 로 노출.

- Pros: 단일 코드 + 다양 호스트
- Cons (강함): Webpack 빌드 도구 lock-in. Vite/Rollup 호스트는 호환 안 됨. 빌드 도구 결정이 *호스트 강제* — 부채 재발.

### 비교

| 기준 | (a) Framework component | (b) iframe-only | (c) Module Federation | **(d) Web Component (채택)** |
|---|---|---|---|---|
| 모든 호스트 환경 (1~6) 지원 | △ (wrapper N개) | △ (1~6 다 iframe) | △ (Webpack 한정) | ◯ (브라우저 표준) |
| 프레임워크 lock-in | ✕ (Svelte 등 강제) | ◯ | ✕ (Webpack 강제) | ◯ |
| 부채 재발 (단편 prop 폭발) | ✕ (N x M) | ◯ | △ | **◯** |
| AI 에이전트 친화 | △ | ◯ | △ | **◯** (HTML 표준) |
| 미래 호스트 (Electron 등) | ✕ | ✕ | ✕ | **◯** (브라우저 표준이면 동작) |
| iframe 환경 통합 | (iframe + wrapper) | (iframe-only) | (iframe + WF) | **postMessage adapter** |
| 모바일 WebView | wrapper 별도 | iframe-in-WebView | 어려움 | **bridge adapter** |

## Consequences

### 직접 박힘

- `packages/core` 가 `<inkvas-viewer>` Web Component 를 *기본 export* — Phase 3 G3 시 첫 등장.
- `packages/host-vanilla|react|vue|bridge` 어댑터 패키지 scaffold (Phase 3+).
- `packages/protocol` 어댑터 — 메시지 스키마 SSOT (Phase 5 G5 시 본격).
- `e2e/host-*/` Playwright contract test scaffold (Phase 4+).
- AGENTS.md C10 강화 — 모든 외부 channel (postMessage / JS bridge) 의 origin/namespace 검증 필수.

### ADR-0003 (Framework) 에 미치는 강제

- *내부 프레임워크* 는 Web Components 로 *컴파일 가능* 해야 함. Lit (자연 fit), Svelte 5 customElement 모드, React (lit-react wrapper), Vue (defineCustomElement) 등.
- *호스트 어댑터* 는 각 프레임워크 native 형식 (React component / Vue component) 으로 wrap — Lit 의 `@lit/react`, Svelte 의 wrap-react 등 후보.

### Trade-off

- Web Components 표준의 *Shadow DOM* — CSS isolation 강함, 호스트 CSS 침투 차단. 단점: 호스트 *theming* 은 CSS custom properties (`--inkvas-*`) 또는 `::part()` API 로만.
- Web Components 의 *attribute → property* 직렬화는 string 강제 — 복잡 객체 (예: `user-data={…}`) 는 JS property 로만 (HTML attr 불가). 호스트 어댑터가 추상화.
- IE 11 미지원 (Web Components polyfill 안 함) — 솔루션화 단계 (Phase 7) 시 *지원 브라우저 명시* (Chromium 90+ / Safari 14+ / Firefox 88+).

### 후속 트래커

| # | 액션 | 시점 |
|---|---|---|
| T1 | 메시지 스키마 v1 *전수* 정의 (`@inkvas/protocol`) | Phase 5 G5 진입 시 |
| T2 | Android JavascriptInterface 표준 메서드명 박힘 | Phase 5 |
| T3 | iOS WKMessageHandler 표준 핸들러명 박힘 | Phase 5 |
| T4 | Web Components polyfill 정책 박힘 (Chromium 90 기준 안 필요) | Phase 7 |

### Risk class

**critical** — 본 ADR 변경은 *모든 호스트* 영향. supersede 시 모든 호스트 어댑터 v2 필요.

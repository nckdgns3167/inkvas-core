# ADR-0011: CJK 폰트 서브세팅·다국어 fallback — Pretendard + Noto Sans CJK + pdf.js standard_fonts

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: D13 (CJK 폰트 fallback)
- Related ADRs: ADR-0004 (pdf.js — embedded font + cmap), ADR-0003 (Lit Shadow DOM CSS)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §Phase 2 ADR-0011

> 한국 시장 진입의 *불변 입력*. 옛 viewer 의 *텍스트 회귀* 부채 인용 — 한·중·일 PDF 의 텍스트 깨짐 사고 빈번. 본 ADR 이 차단.

## Context

PDF 의 CJK 폰트 시나리오:
1. **PDF 내장 폰트** — PDF 가 자체 폰트 embed. pdf.js 가 *그대로* 사용 (D13 자동 통과).
2. **PDF 미embed + standard 폰트 참조** — pdf.js 의 `cMapUrl` + `standardFontDataUrl` 로 fallback. CJK fallback 필요.
3. **Inkvas 자체 UI / 어노 텍스트** — Inkvas 의 *어노 텍스트 (textbox / note)* 가 CJK 표시 가능해야.

옛 viewer 부채:
- 미embed CJK PDF 의 *글자 깨짐* (□ 박스 표시)
- 어노 텍스트의 *한글 자간/행간* 불균형

## Decision

**Pretendard (UI / 어노 텍스트) + Noto Sans CJK (PDF fallback) + pdf.js standard_fonts + cmaps 로컬 번들**.

### 1. Inkvas UI + 어노 텍스트 → **Pretendard**

Korea 의 *de facto* 한글 sans-serif. 다국어 (Latin / CJK 일부) 통합.

```css
:host {
  --ink-font-ui: 'Pretendard Variable', Pretendard, -apple-system, system-ui, sans-serif;
  --ink-font-mono: 'JetBrains Mono', 'D2Coding', monospace;
}
```

### 2. PDF 내장 미embed CJK → **Noto Sans CJK**

`pdfjs-dist` 의 standardFontDataUrl + cmaps 가 *기본 fallback 제공*. CJK 추가 fallback:

```ts
// packages/core/src/render/pdf-source.ts
const loadingTask = getDocument({
  url: pdfSrc,
  cMapUrl: '/cmaps/',          // 로컬 번들
  cMapPacked: true,
  standardFontDataUrl: '/standard_fonts/',
  useWorkerFetch: true,
});
```

`/cmaps/` 와 `/standard_fonts/` 는 Vite 빌드 시 정적 import. CJK cmaps (`Adobe-Korea1-*.bcmap`, `Adobe-Japan1-*.bcmap`, `Adobe-CNS1-*.bcmap`, `Adobe-GB1-*.bcmap`) 가 모두 포함.

### 3. Air-gap 호환 (P6-2)

- 모든 폰트 / cmap 자원이 *로컬 번들* — 외부 CDN fetch 0
- Pretendard / Noto Sans CJK 폰트도 정적 import (`?url` 패턴)
- 옛 viewer 의 *Google Fonts CDN 의존* 부채 차단

### 4. 한국어 타이포 best practice (c3 ADR-0011 정합)

c3 의 ADR-0011 한국어 타이포 표준 *부분 참조*:

```css
/* 한국어 가독성 우선 */
:host {
  --ink-tracking-default: -0.02em;  /* 자간 */
  --ink-line-height-heading: 1.35;
  --ink-line-height-body: 1.55;
}
.heading { letter-spacing: var(--ink-tracking-default); line-height: var(--ink-line-height-heading); }
.body { letter-spacing: var(--ink-tracking-default); line-height: var(--ink-line-height-body); }
```

검증: Stylelint custom rule (Phase 3+) — 모든 텍스트 컴포넌트가 본 토큰 사용.

### 5. 어노 텍스트 (TextBox entity) 폰트

- 기본: Pretendard
- 사용자 선택 가능 (Phase 4+): 시스템 폰트 / Pretendard / monospace (D2Coding) / serif (Noto Serif KR)
- 폰트 선택은 *문자열 식별자* — TextBox entity 에 `font: 'pretendard' | 'mono' | 'serif'` 필드, 실제 CSS 매핑은 viewer 측

## Alternatives Considered

### (a) System font stack 만

- Pros: 가장 작음
- Cons: 시스템별 한글 폰트 차이 (Windows 맑은 고딕 vs macOS Apple SD Gothic Neo) — 시각 일관성 0.

### (b) Pretendard 전용 (CJK 까지)

- Pros: 단일 폰트
- Cons: Pretendard 의 *간체·일본어 글리프 부족*. 중·일 사용자 깨짐.

### (c) Pretendard (UI) + Noto Sans CJK (PDF fallback) ← **채택**

UI 일관성 + PDF 호환성 + 다국어 지원 동시.

## Consequences

### 직접 박힘

- `packages/core/src/styles/fonts.css` — `@font-face` declarations + CSS variables
- `packages/core/public/fonts/` — Pretendard / Noto Sans CJK 정적 자원
- `packages/core/public/cmaps/`, `packages/core/public/standard_fonts/` — pdf.js 자원
- Vite 빌드 — fonts/cmaps 정적 import + bundle

### 측정 지표

- 한·중·일 샘플 PDF (각 10개 이상) 100% 정상 렌더 (글자 깨짐 0)
- 어노 텍스트 한글 자간 `-0.02em` 적용 검증
- Air-gap 빌드 시 외부 CDN fetch 0 (Network tab 검증)

### Trade-off

- 폰트 자원 크기 — Pretendard ~6MB / Noto Sans CJK subset ~5MB / cmaps ~2MB ~= 총 ~13MB. *초기 로드* 부담. 대응: subset (subset-font 도구), lazy load (UI 우선, CJK fallback 만 lazy).

### Risk class

**mid** — 폰트 변경은 시각 영향, 코드 영향 미미.

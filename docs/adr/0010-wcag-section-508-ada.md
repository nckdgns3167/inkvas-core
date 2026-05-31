# ADR-0010: WCAG 2.1 AA / Section 508 / ADA — Lighthouse 95+ 상시 게이트 + 키보드 + 스크린리더

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: D12 (WCAG 2.1 AA 준수)
- Related ADRs: ADR-0003 (Lit Web Components — Shadow DOM 의 a11y 영향), ADR-0018 (태블릿 입력 — 키보드 등가)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §"솔루션화 컨설팅 (3) B2B/B2G 진입 *킬 위협*" — "접근성 (WA, WCAG 2.1 AA), Phase 1 부터 axe CI 상시"

> bootstrap.md 명시: *"Phase 1 부터 axe CI 상시"*. B2G 진입 (Phase 7) 의 *불변 baseline*. 한국 WA 마크 인증 + 미국 Section 508 / ADA 준수.

## Context

WCAG 2.1 AA = *베이스라인 표준*. Section 508 (미국 연방) + ADA (미국 차별금지) + 한국 WA 마크 = *시장별 인증 요건*. 모두 *WCAG 2.1 AA 위에서 derive*.

옛 viewer 의 a11y 상태 (`PDF_VIEWER_HISTORY.md` 참조): *측정 부족*. Lighthouse / axe 자동화 게이트 없음. Phase 1 부터 Inkvas 는 *상시 게이트*.

PDF 어노 viewer 의 *어려운 a11y 영역*:
- Canvas (D12) — 표면적으로 스크린리더 접근 0. 어노는 *대안 텍스트* 또는 *ARIA live region* 으로 보완 필요.
- 마우스 / 터치 / S Pen 입력 — *키보드 등가* 필수 (W3C 1.1.1)
- Color contrast — 어노 색상 (특히 형광펜) 가 텍스트 가독성 영향
- Focus management — 툴바·사이드바·팝오버의 focus trap

## Decision

**Lighthouse a11y 95+ 상시 게이트 + axe-core CI + ARIA + 키보드 단축키 풀세트 + Shadow DOM accessibility**.

### 1. 자동 게이트

```yaml
# .github/workflows/a11y.yml (Phase 3+ 활성)
name: a11y
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm build
      - run: pnpm lighthouse:a11y  # Lighthouse CI, min 95
  axe:
    steps:
      - run: pnpm test:axe          # axe-playwright, 0 violations
```

`init.sh` 의 step [7/9] `a11y axe` 가 Phase 3+ 활성. 95+ 미달 시 init.sh fail.

### 2. 키보드 단축키 풀세트

| 도구·동작 | 키 |
|---|---|
| 펜 | `P` |
| 형광펜 | `H` |
| 지우개 | `E` |
| 텍스트 | `T` |
| 도형 (사각/원/직선) | `R` / `O` / `L` |
| 선택 | `V` |
| Pan (1손가락 등가) | `Space + drag` |
| 줌 in / out / 100% | `Ctrl+=` / `Ctrl+-` / `Ctrl+0` |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y` |
| Find in PDF | `Ctrl+F` |
| 페이지 이동 | `PageUp` / `PageDown` / `Home` / `End` |
| 썸네일 사이드바 토글 | `Ctrl+B` |
| 저장 | `Ctrl+S` |
| 도움말 | `?` |

`docs/manual/02-keyboard-shortcuts.mdx` (Phase 4+ 박힘) 가 사용자 문서.

### 3. 스크린리더 (Canvas 보완)

```html
<!-- LitElement template — annotation overlay 의 ARIA -->
<canvas
  role="img"
  aria-label="PDF annotation overlay, ${strokeCount} strokes, ${noteCount} notes"
  aria-describedby="canvas-live"
></canvas>
<div id="canvas-live" aria-live="polite" aria-atomic="false">
  <!-- 동적 업데이트: "User Alice added a pen stroke", "Comment thread opened" -->
</div>
```

ARIA live region 으로 *어노 추가·삭제·코멘트* 이벤트를 스크린리더에 알림. 사용자별 색상 변화도 텍스트로 announce.

### 4. Focus management

- 툴바 focus trap (모달 / 팝오버)
- `Tab` 순서: 툴바 → 사이드바 → 메인 캔버스 → 우하단 SaveFab → 닫기
- `Escape` — 팝오버 닫기 + focus 복원
- `Roving tabindex` — 도구 그룹 안에서 화살표 키 이동

### 5. Color contrast

- 어노 색상 picker 가 *contrast ratio 4.5:1 미달* 시 경고 표시
- 형광펜 모드는 *PDF 텍스트 가독성* 영향 — 옅은 색 (alpha 0.4 이하) 강제
- 다크 모드 (Phase 4+) — 색상 token 의 dark variant 박힘

### 6. Shadow DOM accessibility

Lit Web Components 의 Shadow DOM 안에 있는 요소는 *외부 페이지의 ARIA 와 단절* 가능 — `role`/`aria-*` 속성을 *호스트* (slot) 와 *Shadow* 양쪽에 적절 분배.

- `<inkvas-viewer role="application">` 외부 식별
- Shadow 안의 컴포넌트는 자체 `role`/`aria-*`
- `:host([aria-*])` 패턴으로 호스트 → Shadow 전달

### 7. 점진 개선 — 한국 WA 마크 인증 트랙 (Phase 7)

- Phase 1-4 — WCAG 2.1 AA + Lighthouse 95+ baseline
- Phase 5-6 — 모바일 a11y 보강 (태블릿 환경 스크린리더 검증)
- Phase 7 — 한국 행안부 *WA 마크 인증* 신청 (소요 1-2 개월)

## Alternatives Considered

### (a) WCAG 2.1 AA 미준수 (a11y 후순위)

- Cons (결정적): B2G 진입 직접 차단. WA 마크 / Section 508 / ADA 모두 위반.

### (b) WCAG 2.2 AAA 까지 준수

- Pros: 가장 엄격
- Cons: 일부 AAA 항목 (color contrast 7:1) 이 UI 디자인 자유도 *과도* 제약. AA 가 *시장 표준*.

### (c) WCAG 2.1 AA + 상시 자동 게이트 ← **채택**

위 (a)/(b) 의 균형 — *시장 baseline + 자동 검증*.

## Consequences

### 직접 박힘

- `.github/workflows/a11y.yml` — Lighthouse + axe-playwright CI (Phase 3+)
- `init.sh` step [7/9] — `pnpm test:a11y` 활성
- `packages/core/src/components/*` — 모든 컴포넌트 ARIA 의무
- `docs/manual/02-keyboard-shortcuts.mdx` (Phase 4 박힘)
- AGENTS.md §6.1 — 컴포넌트 작업 시 *키보드 등가 + ARIA + focus* 검증 의무

### Phase 매핑

- **Phase 3** — Lighthouse a11y 95+ 첫 활성 (Vertical Slice G3 게이트)
- **Phase 4** — 키보드 단축키 풀세트 (어노 도구) + ARIA live region
- **Phase 7** — WA 마크 인증 신청

### Trade-off

- 디자인 자유도 일부 제약 (color contrast 등) — Inkvas 의 *잉크 메타포* 시각화는 *명도 차* 가 큰 디자인 (Adobe ink, 진청·연하늘) 와 자연 정합.
- 키보드 단축키 학습 부담 — `?` 도움말 + 툴바 hover tooltip 으로 노출.

### Risk class

**critical** — B2G 진입 직접 baseline. 변경 시 모든 a11y CI 영향.

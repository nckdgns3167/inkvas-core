# DESIGN.md — Inkvas 시각/UX SSOT

> 이 문서는 Inkvas 의 *시각/UX 의도* SSOT. colors, typography, spacing, components, do's & don'ts. 코드는 이 문서를 *derive* 하는 결과물 (build-tokens 스크립트, Phase 3+ 도입).
>
> **Phase 1 시점: 빈 토큰 scaffold.** 본 문서는 Phase 3 (Vertical Slice) 진입 시 *벤치마킹 워크플로* 결과로 채워짐. AGENTS.md §6.1 의 워크플로 적용.

---

## 0. 상태

- Phase 1: **scaffold only** — 헤딩 + placeholder.
- Phase 3 진입 시: Adobe Acrobat / PSPDFKit / pdf.js / Figma 등 1~2 reference 클론 분석 후 채움.
- Phase 4: 어노테이션 도구 시각 톤 확정 (펜·형광펜·지우개·텍스트·도형 cursor + UI 마이크로 인터랙션).

## 1. 브랜드 톤 (ADR-0000 헌법 derive)

> 비어있음. Phase 3+ 채움.
>
> 입력: ADR-0000 의 (1) 톤·포지셔닝 (Figma · Notion 톤 + 자유 캔버스·드로잉) + (5) 글로벌 SaaS 작명 관행 (부드러운 자음 + 열린 모음 + 살짝 시적).

## 2. Color tokens

> 비어있음. Phase 3+ 채움.
>
> 시드 후보: `--ink-canvas-bg` (페이지 외부 배경), `--ink-paper` (PDF 페이지 종이톤), `--ink-stroke-default` (펜 기본색), `--ink-highlight-yellow|green|pink` (형광펜 3종), `--ink-comment-author-*` (사용자별 5색 cycle, USP-2 협업).

## 3. Typography

> 비어있음. Phase 3+ 채움 (ADR-0011 한국어 타이포 best practice 정합).

## 4. Spacing / Layout

> 비어있음. Phase 3+ 채움.

## 5. Cursor / Tool icons

> 비어있음. Phase 4+ 채움.
>
> 어노테이션 도구별 cursor 시안:
> - 펜 (pen): ink-drop cursor with offset crosshair
> - 형광펜 (highlighter): thick line cursor
> - 지우개 (eraser): circle radius preview
> - 텍스트 (text): I-beam + caret blink
> - 도형 (shape): crosshair + shape preview
> - 선택 (select): arrow + lasso variant
> - pan: hand (default) / grabbing (active)

## 6. Component patterns

> 비어있음. Phase 3+ 채움.
>
> Phase 4 시점 박힘 후보:
> - PdfToolbar (상단)
> - SaveFab (우하단)
> - 좌측 ThumbnailSidebar
> - MiniToolbar (선택 시 floating)
> - ToolHint (도구 첫 사용 시 tooltip)
> - Toast (피드백)
> - ConfirmDialog
> - 색상·굵기 Popover

## 7. Tablet-specific (B4 / ADR-0018)

> 비어있음. Phase 3+ 채움.
>
> 시드:
> - Touch target ≥ 44×44px (Apple HIG)
> - S Pen 압력 시각화 (실시간 stroke width 변화)
> - 손바닥 거치 (palm rejection) — Pointer Events `pressure` + `pointerType==="pen"` 우선
> - 핀치 zoom 0.5~5x 초점 보정 (옛 viewer viewPinchZoom 알고리즘 참조, 코드 재작성)

## 8. Do's & Don'ts

> 비어있음. Phase 3+ 채움.
>
> 시드:
> - Do: 잉크의 *유동성* + 캔버스의 *경계* 시각적 함의
> - Don't: "PDF 뷰어" 카테고리 자기제한 (ADR-0000 헌법)
> - Don't: 페이지 영역과 자유 캔버스 영역의 시각적 경계가 흐려지지 않게 (USP-4 명확성)

## 9. 변경 이력

| 일자 | 변경 |
|---|---|
| 2026-05-12 | scaffold 박힘 (Phase 1) |

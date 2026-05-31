# ADR-0004: PDF Rendering — pdf.js + streaming + lazy page (Phase 4 fallback: PDFium WASM)

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: B5 (long-task 0), B6 (memory <500MB for 100MB PDF), D13 (CJK fallback)
- Related ADRs: ADR-0005 (어노 엔진 — 렌더 위에 오버레이), ADR-0006 (Worker pool — pdf.js worker 통합), ADR-0011 (CJK 폰트)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §Phase 2 ADR-0004

> bootstrap.md 부채 인용: *"큰 PDF 메모리 부담"*. 옛 viewer 가 pdf.js 사용했지만 *전체 페이지 사전 렌더* 패턴으로 100MB PDF 시 OOM. 본 ADR 은 *동일 라이브러리* 선택하되 *streaming + lazy page* 패턴 강제로 부채 차단.

## Context

PDF 렌더링 후보 (bootstrap.md §Phase 2 ADR-0004 명시):

- **Mozilla pdf.js** — JS-based, ~3MB worker, 가장 성숙, 옛 viewer 가 사용
- **pdf.js + WASM tiling** — 커스텀 타일 캐시 layer 추가 (큰 PDF 성능 개선)
- **서버 raster** — 서버가 PNG/JPEG 사전 렌더, 클라이언트는 image viewer
- **PDFium WASM** — Google Chrome 의 PDF 엔진 (PDFium) WASM 컴파일, ~5MB, 빠름

옛 viewer 부채 *재발 회피 조건*:
- **B6 (memory <500MB for 100MB PDF)** — 전체 페이지 한 번에 로드 안 됨. 가시 영역 ± buffer 만 로드.
- **B5 (long-task 0)** — 렌더는 Worker. 메인스레드 점유 50ms+ 차단.
- **D13 (CJK)** — 한·중·일 폰트 깨짐 0. pdf.js 의 standard_fonts + CJK subset 정합.

추가 제약 (Inkvas 특화):
- *air-gap 빌드* (P6-2, Phase 7) — 외부 CDN 의존 0. 모든 PDF 렌더 자원 (worker, standard_fonts, cmaps) 로컬 번들.
- *어노 좌표계 연동* (ADR-0005) — pdf.js 의 viewport transform 이 어노 엔진의 좌표계와 *항등* 변환 가능해야 함.
- *USP-4 자유 캔버스* — pdf.js 페이지 *외부* 좌표에 어노 그리기 가능해야 함. 즉, pdf.js 가 *페이지 단위 격리 canvas* 인 경우 외부 공간 도입 어려움. → 어노 캔버스는 *별도 layer*, pdf.js 는 *콘텐츠만*.

## Decision

**pdf.js (v4+) + range requests + page-level lazy rendering + Worker (ADR-0006 공유 pool)**.

### 핵심 구조

```
┌─────────────────────────────────────────────────┐
│ Inkvas Viewer (LitElement, ADR-0003)            │
│ ┌─────────────────────────────────────────────┐ │
│ │ Canvas layer hierarchy (USP-4 자유 캔버스):   │ │
│ │                                              │ │
│ │ [3] Annotation canvas (overlay)              │ │
│ │     ↑ page coords + free coords (외부 공간)   │ │
│ │                                              │ │
│ │ [2] Text layer (selectable text from pdf.js) │ │
│ │     ↑ page coords only                       │ │
│ │                                              │ │
│ │ [1] PDF page canvas (pdf.js render)          │ │
│ │     ↑ page coords only                       │ │
│ │                                              │ │
│ │ [0] Infinite canvas background               │ │
│ │     ↑ free coords (USP-4)                    │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
              ↓ pdf.js worker
        ┌──────────────┐
        │ pdf.js v4+   │
        │ Worker thread│
        └──────────────┘
              ↓ range request
        ┌──────────────┐
        │ PDF source   │
        │ (URL / blob) │
        └──────────────┘
```

### 1. **Range requests + streaming**

`pdf.js` 의 `getDocument({ url, rangeChunkSize: 256KB })` — HTTP Range request 로 *필요한 페이지만* 다운로드. 100MB PDF 라도 첫 페이지 표시까지 ~1MB 다운로드 (header + 첫 페이지 stream).

### 2. **페이지 단위 lazy render + LRU cache**

- 가시 페이지 (viewport 안) + buffer (위·아래 1 페이지) = 3 페이지 렌더 유지
- 그 외 페이지는 *placeholder* 또는 *low-res 썸네일* (옛 viewer 의 thumbnail 자산 *참조* 후 재구현)
- LRU cache: 최대 10 페이지 렌더 상태 보존. 초과 시 unload.

### 3. **Worker pool 공유 (ADR-0006)**

- pdf.js worker 는 *전용 worker* (라이브러리 자체 worker). 메인스레드 부담 0.
- Inkvas 의 어노 렌더링 worker pool (ADR-0006) 와 *별도 worker* — 충돌 없음.

### 4. **어노 캔버스 분리 (USP-4 호환)**

- pdf.js 가 *페이지 canvas* 만 렌더. 페이지 외부는 *완전 빈*.
- Inkvas 의 *어노 캔버스* 는 별도 layer — 페이지 캔버스 *위* + 페이지 외부 *모두* 그릴 수 있는 단일 무한 평면.
- 좌표 변환: pdf.js viewport transform 을 어노 캔버스가 *동일하게 derive* — `viewer.viewport.transform * annotation.local_coords = world_coords`.

### 5. **air-gap 빌드 (P6-2)**

- pdf.js worker JS + standard_fonts + cmaps 모두 로컬 번들 (Vite 빌드 시 정적 임포트).
- 외부 CDN (Mozilla CDN 등) fetch 0.

### 6. **D13 CJK fallback**

- pdf.js v4+ 가 CJK fonts 자동 fallback 지원. `cMapUrl` 로 cmap 자원 명시.
- 추가: ADR-0011 (CJK 폰트 서브세팅) 의 결정에 따라 Pretendard/Noto Sans CJK 등 폰트가 *어노 텍스트* 에 사용 (PDF 자체 폰트는 PDF 가 embedded).

## Phase 4 fallback 정책

Phase 4 perf 게이트 (B5/B6) 실패 시 *순차 대응*:

1. **Step 1** — pdf.js 의 `disableRange: false`, `disableStream: false` 확인 + LRU cache 크기 튜닝
2. **Step 2** — pdf.js render quality 옵션 조정 (`canvasFactory.create` 의 device pixel ratio 동적)
3. **Step 3** — *WASM tiling layer* 도입 (pdf.js 의 페이지 canvas 를 256x256 타일로 분할, GPU compositor layer 분리)
4. **Step 4 (최후)** — **PDFium WASM 로 마이그레이션** (별도 ADR-0004a supersede)

Step 4 는 *Phase 4 perf 게이트 fail* 한정 *비상*. PDFium WASM 의 trade-off:
- Pros: 더 빠른 렌더, Chrome 와 동일 엔진 (PDF 호환성 최고)
- Cons: ~5MB binary, JS API 가 pdf.js 만큼 풍부하지 않음 (text extraction 등 일부 직접 구현), 통합 비용 큼

## Alternatives Considered

### (a) 서버 raster (서버가 PNG 렌더)

- Pros: 클라이언트 메모리 0, 빠른 첫 표시
- Cons (결정적):
  - air-gap (Phase 7) 환경 — 서버가 *고객 망 안* 동작해야. 추가 서버 운영 부담.
  - 텍스트 selection 불가 (이미지만)
  - 어노 좌표계 정합 어려움 (서버가 페이지 크기 결정, 클라이언트는 image 만)
  - 확대 시 해상도 *손실* (PNG 가 raster)
  - B2G 망분리 환경의 *server-side rendering* 라이선스 / 컴플라이언스 별도 검토 부담

### (b) 처음부터 PDFium WASM

- Pros: 가장 빠른 렌더, Chrome 호환성 100%
- Cons (결정적):
  - 통합 비용 큼 (text extraction 등 직접 구현), Phase 3 G3 지연
  - 솔로 + AI 환경에서 PDFium 학습 자료 *부족* (pdf.js 대비)
  - bootstrap.md "한국가스안전공사 (가스피아) 도입 경험" 자산이 옛 viewer (pdf.js 기반) → 도메인 회고 (`PDF_VIEWER_HISTORY.md`) 가 pdf.js context — *지식 transfer* 측면에서 pdf.js 가 솔로 dev 에 유리

→ **PDFium WASM 는 Phase 4 *fallback* 으로 trigger 한정 적용**.

### (c) pdf.js + 사전 모든 페이지 렌더 (옛 viewer 패턴 그대로)

- Cons (결정적): **B6 (memory) 부채 *직접 재발***. 본 ADR 차단 항목.

### 비교

| 기준 | (a) 서버 raster | (b) PDFium WASM | (c) pdf.js 전 페이지 (옛) | **(d) pdf.js + streaming (채택)** |
|---|---|---|---|---|
| B6 memory <500MB / 100MB PDF | ◯ | ◯ | ✕ (부채) | **◯** |
| B5 long-task 0 | ◯ | ◯ | △ | **◯** (Worker) |
| 텍스트 selection / search | ✕ | △ (직접 구현) | ◯ | **◯** |
| Air-gap (P6-2) | ✕ (서버 의존) | ◯ | ◯ | **◯** |
| 어노 좌표계 정합 (ADR-0005) | △ | ◯ | ◯ | **◯** |
| USP-4 자유 캔버스 (페이지 외부) | ✕ (이미지 격리) | ◯ | ◯ | **◯** |
| 솔로 + AI 학습 자료 풍부 | △ | △ | ◯ | **◯** |
| 옛 viewer 도메인 회고 transfer | ✕ | ✕ | ◯ (직접) | **◯** (간접 — 동일 라이브러리) |
| Phase 3 G3 진입 속도 | △ | ✕ | ✕ (재구현 부담) | **◯** |
| 부채 재발 회피 | ◯ | ◯ | ✕ | **◯** (streaming 패턴 차단) |

→ **(d) pdf.js + streaming 가 10/10 기준 통과**. (a)/(b) 는 결정적 결함, (c) 는 부채 직접 재발.

## Consequences

### 직접 박힘

- `packages/core/package.json`: `pdfjs-dist` (v4+) dependency.
- `packages/core/src/render/pdf-source.ts` — pdf.js 통합 wrapper (range request, lazy page, LRU cache).
- `packages/core/src/render/canvas-layers.ts` — 4 layer 구조 (infinite bg / pdf page / text / annotation).
- Vite 빌드 설정: pdf.js worker + standard_fonts + cmaps 정적 import (`?worker` 패턴), `inkvas-legacy-assets/pdf_viewer_svelte/static/cmaps/` *참조만*, 재번들.
- AGENTS.md §6.1 컴포넌트 작업 패턴 — 새 렌더 컴포넌트는 *page coord ↔ free coord* 변환 함수 명시 의무.

### Phase 4 perf 게이트 명시

- 1000+ stroke 렌더 60fps (PC + 태블릿)
- Eraser 10k segment <16ms
- 메인스레드 long-task 0
- 100MB PDF 메모리 사용 <500MB
- a11y 회귀 0

위 5 게이트 fail 시 Phase 4 fallback 정책 (Step 1→4) 트리거. Step 4 (PDFium WASM) 까지 진입하면 별도 ADR-0004a supersede 작성.

### Trade-off

- pdf.js 라이브러리 *외부 의존성* — Mozilla 가 유지보수. CVE 발생 시 patch 신속 적용 의무 (ADR-0016 Security baseline 의 input).
- pdf.js 의 *Apache-2.0 호환* 라이선스 — Apache-2.0 OSS core 와 정합 (Mozilla pdf.js 는 Apache-2.0). A1 통과.

### Risk class

**critical** — PDF 렌더는 viewer 의 *전체 baseline*. supersede 시 Phase 4 이후 모든 게이트 재검증.

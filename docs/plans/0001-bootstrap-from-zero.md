# Inkvas — PDF Annotation Solution Bootstrap

> **이 파일은 새 Claude Code 세션의 *유일한 진입점* 이다 — PC·OS 독립.**
> 사용자는 `<INKVAS_ROOT>` (빈 폴더) 를 만들고 그 폴더를 작업 디렉토리로 새 Claude Code 세션을 연다.
> 세션 시작 시 사용자가 첫 prompt (아래) 를 보낸다. 부트스트랩 md 는 Phase 0 첫 작업에서 `<INKVAS_ROOT>/docs/plans/0001-bootstrap-from-zero.md` 로 *이주* 된다.

---

## 경로 placeholder (PC·OS 독립)

본 md 본문은 모든 경로를 placeholder 로 표기. 새 Claude Code 세션의 첫 prompt 에서 사용자가 실제 경로를 substitute.

| placeholder | 의미 |
|---|---|
| `<INKVAS_ROOT>` | 새 프로젝트 작업 디렉토리 (= 새 Claude Code 세션의 pwd). 바탕화면에 zip 풀면 자동 생성됨. |
| `<BOOTSTRAP_MD>` | 본 부트스트랩 md 파일 경로 (바탕화면) |
| `<C3_ROOT>` | c3 디렉토리 — 새 PC 바탕화면에 *이미 존재* (zip 외부 자산). 하네스 템플릿 5 파일 + ADR + plans + business-direction 등. |
| `<LEGACY_VIEWER_ROOT>` | `<INKVAS_ROOT>/inkvas-legacy-assets` — 옛 PDF 뷰어 자산 종합 폴더. **inkvas 디렉토리 *내부*** 에 두고 **`.gitignore` 대상** (Phase 1 의 .gitignore 에 반드시 포함). |

---

## Setup (새 PC 진입)

**전제**: 새 PC 바탕화면에 c3 디렉토리가 *이미 존재* (`<Desktop>/c3`).

1. `inkvas-bootstrap-package.zip` 을 바탕화면에 압축 해제 — 자동으로 다음이 펼쳐진다:
   - `<Desktop>/inkvas-bootstrap.md` (본 파일)
   - `<Desktop>/inkvas/` (작업 폴더 — 빈 폴더 mkdir 불필요, zip 안에 이미 폴더 존재)
   - `<Desktop>/inkvas/inkvas-legacy-assets/` — 옛 PDF 뷰어 자산 (`pdf_viewer_svelte/` + `demo1-docs/40_Features/`)
2. `<Desktop>/inkvas/` 폴더를 작업 디렉토리로 새 Claude Code 세션을 열고, *별도로 전달받은 첫 prompt* 를 그대로 붙여넣는다.

**즉시 추가 작업 — 새 세션이 Phase 1 에서 자동 처리**:
- `<INKVAS_ROOT>/.gitignore` 생성 시 `inkvas-legacy-assets/` 항목 반드시 포함. legacy 자산은 *참조 자료*일 뿐 inkvas 레포에 commit 되지 않아야 함 (Apache-2.0 OSS 코어에 옛 코드 라이선스 혼선 차단 + 레포 슬림화).

### 옛 PDF 뷰어 자산 구조 (참고)

```
<INKVAS_ROOT>/
└── inkvas-legacy-assets/                # *.gitignore 로 차단*
    ├── pdf_viewer_svelte/                # 옛 뷰어 코드 + 문서 (node_modules·dist 제외)
    └── demo1-docs/
        └── 40_Features/
            ├── PDF_VIEWER_HISTORY.md           # ★★ 도메인 회고 (재현 필수 UX 식별 1순위)
            ├── PDF_VIEWER_INFINITE_CANVAS.md   # ★★ 자유 캔버스 컨셉
            ├── PDF_VIEWER_OPTIMIZATION.md      # 성능 튜닝 히스토리
            ├── PDF_MARKUP_CUMULATIVE_SAVE.md   # 저장 누적 흐름
            └── OFFLINE_PDF_MARKUP_SYNC.md      # 오프라인 동기화 흐름
```

이 자산은 *참조만*, 채택 금지. 모든 기술 결정은 새 ADR 로 재평가.

---

## Context

**왜 리빌딩 하는가**: 기존 `<LEGACY_VIEWER_ROOT>/pdf_viewer_svelte` 는 *제대로 된 설계 없이* 막연한 생각으로 누적되었고, 솔루션화 (B2B/B2G — 민간·공공·중소기업) 를 목표로 하니 (a) 운영 하네스 부재, (b) 기술 부채 (paper.js 메인스레드 직렬화, eraser O(N²), 텍스트 회귀 등), (c) 비즈니스 모델·메뉴얼·라이선스 경계 미정 등이 모두 *구조적 한계* 로 작동. 코드 일부만 손보는 것으로는 솔루션 grade 에 도달 불가.

**무엇을 다르게**: 사용자의 다른 사업성 아이템 c3 (`<C3_ROOT>`) 와 *동등한 하네스 수준* (AGENTS.md + ADR + Plan-as-Code + Pre/Post-mortem + feature_list 게이트 + init.sh 6단 검증 + glossary + business-direction Live) 으로 부트스트랩. 기존 자산은 *참조* 만 — "이전에 그랬으니까" 라는 이유로 채택 금지, 모든 기술 결정은 ADR 로 재평가.

**의도된 결과**:
- 새 Claude Code 세션이 본 plan 만 읽고 *자율* 진행 가능.
- Phase 0 (비즈니스 가설) → Phase 7 (B2B/B2G 진입 준비) 까지 *Gate-Lock* 으로 일관 진행.
- 기존 UX 시그니처는 *최소한* 동등 재현, 가능하면 상회 (a11y / 성능 / 호스트 호환성).
- Open-core (Apache-2.0) + 엔터프라이즈 라이선스 분리, 두 레포 (Public + Private) 동시 관리.
- 메뉴얼·비즈니스 분석이 *워크플로우 게이트* 로 박혀 자동 최신화.

---

## 사용자 결정 (확정)

| 항목 | 결정 |
|---|---|
| **프로젝트명** | **Inkvas** (확정 — 결정 사유는 아래 별도 섹션 + ADR-0000 에 그대로 기록) |
| 위치 | `<INKVAS_ROOT>` (c3 와 동일 레벨 배치 권장 — 같은 부모 디렉토리 안 c3 와 형제) |
| GitHub 가시성 | Public + Private 두 레포 관리 (c3 패턴 따름). 후보 레포명 — `inkvas-core` (Public, Apache-2.0) / `inkvas-enterprise` (Private, commercial dual) |
| 기술스택 | ADR-0003 ~ ADR-0011 에서 *완전 처음부터* 재결정. 기존 스택 (Svelte 5 / paper.js / pdf.js 등) 채택 금지 — 다시 비교 후 ADR 로 결정. |
| 비즈니스 모델 | Open-core + 엔터프라이즈 라이선스 |
| 하네스 | C3 동등 (완전 하네스) |
| 부트스트랩 md 위치 | `<BOOTSTRAP_MD>` → Phase 0 첫 작업에서 `<INKVAS_ROOT>/docs/plans/0001-bootstrap-from-zero.md` 로 *이주* (mv, 사본 X) |
| **핵심 차별 기능 (USP)** | (1) **위변조방지** (서명·hash chain·audit trail·optional 블록체인) / (2) **협업** (멀티 사용자, 권한·역할) / (3) **동시작업** (실시간 CRDT) / (4) **자유 캔버스 드로잉** (페이지 위·외 무한 캔버스, infinite canvas) / (5) **작업이력 영속성** (메모리만 아닌 DB+분산 영구) |
| **필수 환경 제약** | PC 브라우저 + **태블릿** (Galaxy Tab S9 FE+ 동등) — pan & zoom 60fps 깨끗 동작. 손가락 핀치 + 2손가락 pan + S Pen 동시 지원. 태블릿 회귀 0 가 Gate. |

---

## 프로젝트명 — Inkvas (확정)

> **이 섹션 전체를 ADR-0000 ("프로젝트 정체성") 에 그대로 복사·인용해야 한다 — 요약·재해석 금지.** 사용자가 직접 작성한 결정 사유이고, *왜 이 이름이 옳은지* 가 솔루션의 *브랜드 정체성 헌법* 이 됨. 후속 마케팅·로고·UX 톤 결정 모두 이 사유를 입력으로 사용.

### 명칭

**Inkvas** — Ink (잉크) + (can)vas (캔버스). "잉크가 닿는 캔버스" 라는 두 단어가 한 단어로 응축.

### 결정 사유 (사용자 원문)

**(1) 톤·포지셔닝**
- 글로벌 SaaS 톤 (Figma · Notion 톤) + 자유 캔버스·드로잉 컨셉을 고려하여 정했음.

**(2) 의미 응축력**
- 잉크 + 캔버스, 의미가 정확히 컨셉이랑 매칭.
- 컨셉 응축력이 가장 높음. **Ink 가 드로잉의 가장 직관적 메타포** 이고, **vas 가 canvas 를 함의** 해서 *"잉크가 닿는 캔버스"* 가 그대로 풀려.

**(3) 발음·기억성**
- 짧고 발음 쉬움. 2음절.
- 한국에서 "잉크바스" 로 음역해도 자연스러움.

**(4) 도메인·상표 가능성**
- 거의 안 쓰이는 조어라 도메인·상표 가능성 높음.

**(5) 글로벌 SaaS 작명 관행 부합**
- 2음절, 짧음 (Figma, Notion, Linear, Miro, Canva, Loom 과 동일 길이감).
- 부드러운 자음 + 열린 모음 — 발음할 때 입이 편함.
- 의미는 살짝 비침 (Figma 는 figure, Notion 은 개념, Miro 는 화가 Miró) — 직설적이지 않고 시적. Inkvas 도 *Ink + (can)vas* 가 비치지만 직설 X.
- 카테고리를 넘어서는 확장성 — Notion 이 "노트 앱" 으로 안 묶였듯, Inkvas 도 *"PDF 뷰어"* 카테고리에 묶이지 않고 추후 *어노테이션·협업·캔버스* 영역으로 확장 가능.
- `.com` 이 어렵더라도 `.so`, `.app`, `.io` 로 살아남을 수 있음.

### ADR-0000 작성 지침 (Phase 0 첫 작업)

새 세션의 ADR-0000 은 다음 형식으로:
- **Status**: Accepted (2026-05-12)
- **Context**: 본 섹션 (사용자 원문) 그대로 인용
- **Decision**: 프로젝트명 = `Inkvas` / 도메인 우선순위 = `.app` > `.io` > `.so` > `.com` / OSS 레포 = `inkvas-core` / Enterprise 레포 = `inkvas-enterprise` / 브랜드 음역 (한국) = "잉크바스"
- **Consequences**: 후속 마케팅·로고·UX 톤 결정에 본 사유가 *불변 입력*. 변경 시 ADR supersede 필수.
- **검증 액션** (ADR-0000 작성과 동시에 진행):
  - `.app/.io/.so/.com` + `inkvas` 조합 도메인 whois 4종 가용성 1차 확인
  - npm `inkvas` 패키지명 + `@inkvas/*` 스코프 가용성 확인
  - GitHub `inkvas` org 명 가용성 + 유사 충돌 (`inkvas-*`) 1차 검색
  - 한국 상표 KIPRIS 1차 검색 (정식 출원은 별도 트랙)
  - 검증 결과를 ADR-0000 의 *Consequences* 섹션에 추가 기록. 충돌 발견 시 사용자 confirm 받아 *대응 전략* (다른 도메인 / 변형 / 새 후보) 결정.

---

## 새 Claude Code 세션 부트스트랩 헤더 (Day 0)

세션은 다음 순서로 자율 진행:
1. 본 plan 정독 → `claude-progress.md` 있으면 그 다음 단계부터, 없으면 Phase 0 부터.
2. **WIP=1 잠금** — `feature_list.json` 의 `in_progress` 1 개 초과 시 멈추고 사용자 confirm.
3. **Gate-Lock** — 각 Phase Gate 미통과 시 다음 Phase 진입 금지.
4. **암묵 결정 금지** — ADR 미결정 사항은 사용자 confirm 받아 ADR 추가 후 진행. "이전에 그랬으니까" 라는 이유의 결정은 ADR 에 명시적 *대안 비교표* 없이 채택 불가.

---

## Phase 0 — Identity & Business Hypothesis  (코드 0줄)

**목표**: 비즈니스 가설·세그먼트·차별화·라이선스 경계 확정 *전에는 한 줄도 안 짠다*. 솔로 개발자가 가장 자주 실패하는 패턴 ("일단 짜자 → 6개월 후 리라이트") 차단.

**첫 작업 — ADR-0000 + 부트스트랩 이주 + 레포 생성**:
1. **ADR-0000 작성** — 프로젝트명 = `Inkvas` *확정* (위 "프로젝트명 — Inkvas (확정)" 섹션 원문 인용). 가용성 검증 4종 (도메인 / npm / GitHub / 상표) 수행 후 결과를 ADR Consequences 에 기록.
2. `<INKVAS_ROOT>` 디렉토리는 *이미 사용자가 생성* (빈 폴더). 본 세션의 작업 디렉토리 (pwd).
3. `<BOOTSTRAP_MD>` → `<INKVAS_ROOT>/docs/plans/0001-bootstrap-from-zero.md` 로 **mv** (사본 X). 이주 후 본 부트스트랩 md 가 정식 Plan-as-Code 자리에 박힘.
4. 양 GitHub 레포 생성 + 초기 commit:
   - Public: `inkvas-core` (Apache-2.0, README + LICENSE)
   - Private: `inkvas-enterprise` (commercial dual)
5. 두 레포 토폴로지 결정은 ADR-0001 (Phase 1) 에서 — monorepo + private submodule vs 분리 2 레포 vs pnpm workspace.

**산출물**:
- `ADR-0000` 프로젝트 정체성 (이름·도메인·로고 방향·OSS vs Enterprise 레포 split 방식)
- `README.md` (양 레포) + `LICENSE` (OSS=Apache-2.0 권장, Enterprise=commercial dual)
- `docs/business-direction.md` (Live) — 비전, 타깃 4사분면 (B2B/B2G × 대기업/SMB·공공), JTBD, 가격 정책 초안
- `docs/business/competitive-feature-audit.md` (**Live, 분기 갱신 필수**) — 경쟁사 기능 매트릭스
  - **무료 온라인 도구 카테고리**: PDFaid (사용자 명시 요구), PDF24, iLovePDF, Smallpdf, Adobe Acrobat Online, PDF Candy, Sejda
  - **B2B SDK 카테고리**: PSPDFKit/Nutrient, Foxit SDK, Apryse (前 PDFTron)
  - **OSS 뷰어 카테고리**: Mozilla pdf.js-viewer, PDF.js Express, react-pdf
  - **매트릭스 컬럼**: 기능명 / 경쟁사별 보유 여부 / 우리 도입 후보 (Y/N/Backlog) / 우선순위 (P0/P1/P2) / 도입 시 Phase 매핑 / 차별화 vs 모방 분류
  - **PDFaid 전수 분석 필수** — 사이트의 *모든 편집 화면 기능* (편집·변환·압축·서명·OCR·redaction·watermark·split/merge·rotate·delete pages·extract images·form fill·protect 등) 1차 항목화 후 우리 viewer 솔루션 범위와 *교집합·차집합* 명시. 교집합 = 도입 후보, 차집합 = 의도적 미도입 사유 기록 (예: "변환은 서버 책임, viewer 범위 외").
- `docs/business/reference-tracker.md` — SmartOn/가스피아 (한국가스안전공사) 경험을 *자산화*. 솔로 개발자가 유일하게 가진 무기: *익명 가능한* 도입 사례·증언·재현 데모
- `docs/business/license-boundary.md` — 기능별 OSS ↔ Enterprise 분류표 (renderer/core = OSS / SSO·SAML·audit·DRM·LDAP·HSM·redaction-certified = Enterprise). ADR-0013 의 input.
- `docs/business/usp.md` (**Live, 분기 갱신**) — 핵심 차별 5종을 *경쟁사 audit 와 대칭*으로 정의:
  - **위변조방지 (Integrity)**: 마크업·문서 변조 차단. 후보 기술 — 디지털 서명 (PKI / RSA / ECDSA), hash chain (이전 stroke hash 가 다음에 포함), append-only audit log, optional 블록체인 anchoring (Polygon/Ethereum/private chain). B2G 필수, B2B 차별.
  - **협업 (Collaboration)**: 멀티 사용자 동시 접속, 사용자별 색·권한 (viewer/commenter/editor/owner), 작업이력 사용자별 toggle, 코멘트 스레드, mention.
  - **동시작업 (Real-time concurrent editing)**: CRDT (Yjs / Automerge) 기반 충돌 없는 동시 편집. WebRTC peer-to-peer 또는 WebSocket relay. presence (다른 사용자 커서 시각화).
  - **자유 캔버스 드로잉 (Infinite canvas)**: PDF 페이지 *위* 뿐만 아니라 페이지 *외부* 공간에도 그리기. 페이지 = 무한 캔버스 위 한 *고정 객체*. pan 으로 페이지 너머 작업 영역 탐색. 사용자가 "캔버스 자유도" 를 우선으로 한 *기존 도구 부족 영역*.
  - **작업이력 영속성 (Persistence)**: 메모리 only 폐기 → DB + IndexedDB + 서버 sync. 모든 stroke 가 *영구 기록* (감사 추적 가능). undo/redo 가 세션 한계 없음. 사용자 작업 손실 0.
  - 각 USP 마다 — 정의 / 후보 기술 / 경쟁사 격차 / Phase 매핑 / 측정 지표 명시.

**Gate G0**: 사용자 confirm **5회** — (a) 비즈니스 가설, (b) 라이선스 경계, (c) 가격대 초안, (d) **competitive feature audit 결과 + 도입 후보 우선순위**, (e) **USP 5종 정의·후보 기술·측정 지표**. **미통과 시 Phase 1 진입 금지**.

---

## Phase 1 — Harness Skeleton  (코드는 *하네스만*, 제품 코드 0)

**목표**: c3 의 운영 하네스를 *PDF 도메인 어휘로 substitute* 해 그대로 이식. 17 제약 → PDF 특화 제약 N 개로 재정의.

**c3 에서 이식할 5 파일** (그대로 복사 후 substitute):
- `<C3_ROOT>/AGENTS.md` → 운영 헌법
- `<C3_ROOT>/feature_list.schema.json` → 백로그 스키마
- `<C3_ROOT>/scripts/validate-feature-list.ts` → 7가지 cross-validation
- `<C3_ROOT>/init.sh` → 6단 검증
- `<C3_ROOT>/docs/plans/README.md` → Plan-as-Code 가이드

**PDF 특화 추가**:
- `init.sh` 에 단계 추가 — `a11y axe` (WCAG 2.1 AA), `license-boundary 린트` (OSS↔Enterprise import 차단), `manual-freshness` 검사 (메뉴얼 자동 최신화 gate), **`audit-freshness` 검사** (competitive-feature-audit.md last_updated 가 90일 이상이면 fail)
- `feature_list.schema.json` 에 `manual_impact` 필드 필수 (`"none" | "section" | "new-chapter"`) — `"none"` 외 값인데 PR 에 `docs/manual/**` 변경 없으면 merge 차단
- `feature_list.schema.json` 에 **`audit_ref` 필드** 추가 — 해당 feature 가 competitive-audit 의 어떤 row 에서 유래했는지 (또는 `"original"`). audit 갱신 시 feature 재방문 트레이서블.
- `scripts/competitive-audit-refresh.ts` — 매 PR 시 audit 의 last_updated · 경쟁사별 last_checked 검증. 90일 이상이면 *경고*, 180일 이상이면 init.sh fail. AI 가 사용자에게 갱신 요청.
- `.claude/settings.local.json` — c3 의 42 permission 화이트리스트 + PDF 특화 (pdf.js worker, IndexedDB 등)
- 두 레포 split 방식 결정 (monorepo + private submodule  vs  분리 2 레포  vs  pnpm workspace) — ADR-0001

**산출물**:
- `AGENTS.md`, `DESIGN.md` (빈 토큰), `docs/glossary.md` (빈), `docs/plans/_template.md`, `docs/postmortems/_template.md`
- `.gitignore` — c3 의 .gitignore 를 이식 + **`inkvas-legacy-assets/` 항목 반드시 추가** (참조 자산이 commit 되지 않도록 차단)
- `feature_list.json` 초기 (Phase 1~7 의 epic 1 줄씩)
- `.claude/settings.local.json`, `init.sh`, `scripts/validate-feature-list.ts`
- ADR-0001 (레포 토폴로지), ADR-0002 (Plan-as-Code), ADR-0012 (Pre/Post-mortem 페어링)

**Gate G1**: `./init.sh` 통과 + 양 레포 push 확인 + ADR-0000~0002, 0012 박힘.

---

## Phase 2 — Technical ADR Burst  (코드 거의 0, *결정만*)

**원칙**: 기존 PDF 뷰어의 기술 부채 5종을 *각 ADR 대안 비교 섹션에 명시적 인용* — 재발 방지 트레이서블.

ADR 결정 순서 (의존성):

| ADR | 주제 | 후보 | 부채 인용 |
|---|---|---|---|
| 0003 | 프레임워크 | Svelte 5 / React / Lit / Web Components 표준 | 호스트 임베드 호환성 vs DX |
| 0004 | PDF 렌더링 | pdf.js / pdf.js + WASM tiling / 서버 raster / PDFium WASM | 큰 PDF 메모리 부담 |
| 0005 | 어노테이션 엔진 + **자유 캔버스 (infinite canvas) 좌표계** | paper.js / Konva / Fabric / 자체 SVG+Canvas + 페이지 외부 좌표 허용 설계 | **paper.js 부채** + **USP-4 자유 캔버스 코어** |
| 0006 | OffscreenCanvas + Worker pool | 메인 / Worker / 둘다 | **1000+ stroke 60fps + 태블릿 60fps 미달 부채** |
| 0007 | Eraser 알고리즘 | centerline split / BVH-tree / RBush / Hit-region map | **eraser O(N²) 부채** |
| 0008 | Persistence + **협업·동시작업 (CRDT)** + **작업이력 영속성** | IndexedDB+SW + 서버 sync + Yjs/Automerge CRDT + WebSocket relay or WebRTC + append-only DB | **메모리 only 부채** + **USP-2/3/5 코어** |
| 0009 | Host integration contract | postMessage 스키마 + window.pdfv API + Android JS bridge + iOS WKMessageHandler | **단편 prop 조합 폭발 부채** |
| 0010 | WCAG 2.1 AA / Section 508 / ADA | 자동화 도구 + manual 가이드 | (신규 — B2G 필수) |
| 0011 | CJK 폰트 서브세팅·다국어 fallback | — | (신규) |
| 0013 | Open-core 경계 | Plugin contract + capability registry + ESLint boundaries 룰 | (Phase 3 코드 시작 *전* 반드시 박힘) |
| 0014 | Manual freshness gate | MDX live import + Playwright screenshot diff + init.sh 단 | (사용자 요구) |
| 0015 | Cross-review (Codex/Gemini) | critical/mid plan PR gate | c3 ADR-0014 |
| 0016 | Security baseline | SBOM + signed builds + CVE 모니터링 | B2G 필수 |
| **0017** | **위변조방지 아키텍처 (Integrity)** | PKI 서명 (RSA/ECDSA) / hash chain (Merkle-like, 이전 stroke hash 가 다음에 포함) / append-only audit log / optional 블록체인 anchoring (Polygon/private chain) | **USP-1 코어**. OSS 측 = hash chain + audit log / Enterprise 측 = PKI + 블록체인 anchoring |
| **0018** | **태블릿 입력·성능 표준** | Pointer Events spec / S Pen 압력 / 핀치·2손가락 pan / FLIP animation / GPU compositor layer | **사용자 요구 환경 제약** — Galaxy Tab S9 FE+ 동등 60fps. 기존 viewPinchZoom 검증 자산 *참조* (코드 재작성). Phase 3 부터 *상시 게이트*. |
| **0019** | **권한·역할 모델 (RBAC)** | viewer / commenter / editor / owner + 페이지·도구별 권한 + 사용자별 색·표시 | **USP-2 협업 코어**. Open-core 경계 의 추가 input. |

**중요 순서 함정**:
- ADR-0003 (프레임워크) 는 **ADR-0009 (호스트 통합) 이후에 결정**. 임베드 호환성이 프레임워크 선택을 강제 — Web Components 표준 강력 후보.
- ADR-0005 (어노테이션) 는 ADR-0006 (Worker) + ADR-0007 (Eraser) + **ADR-0018 (태블릿)** 와 *동시 결정*. paper.js 부채 재발 + 태블릿 60fps 동시 만족 가능한 엔진 선택.
- ADR-0008 (Persistence + CRDT) 는 **ADR-0017 (위변조방지) 와 양립 검증 필수**. CRDT 의 *모든 op 가 hash chain 에* 들어가야 함 — 후속 추가가 아닌 *코어 동시 설계*.
- ADR-0018 (태블릿) 의 perf budget 은 Phase 3 Vertical Slice 부터 *모든 Phase 게이트*.

**Gate G2**: ADR **15개** 박힘 + 각 ADR 에 *대안 비교표* + risk_class (critical/mid/low) + 부채 인용 (5종) + **USP 매핑 (5종 모두 ADR-0005/0008/0017/0018/0019 에 트레이서블 연결).**

---

## Phase 3 — Vertical Slice "Render a PDF"  (가장 얇은 1픽셀)

**스코프**: PDF 1 페이지 렌더 + 줌 + 페이지 이동. 어노테이션 0, 저장 0.

**산출물**: F-001 ~ F-005, 첫 Pre/Post-mortem 페어, 첫 manual chapter `docs/manual/01-quickstart.mdx` (live 컴포넌트 import + Screenshot 자동화)

**Gate G3**: E2E "open → render → zoom → next page" 통과 + Lighthouse a11y 95+ + manual freshness 통과.

---

## Phase 4 — Annotation MVP  (재현 필수 UX 시그니처)

**스코프 구성 — 2 레이어**:

(1) **재현 필수 UX** (기존 viewer 동등):
- 펜 / 형광펜 / 지우개 / 텍스트 / 도형 (사각·원·직선)
- 단일 선택 + PowerPoint 식 resize + 회전 인식 좌표변환
- 다중 선택 (Lasso)
- Undo / Redo (페이지별 스냅샷)
- 색상·굵기 팝오버, ToolHint, Toast, ConfirmDialog, MiniToolbar
- 좌측 썸네일 사이드바 + 페이지 입력
- 상단 PdfToolbar + 우하단 SaveFab
- 핀치줌 (0.5x~5x, 초점 보정)
- 페이지별 회전
- 사용자 오버레이 (작업이력 표시/숨김)

(2) **competitive-audit 의 P0 항목** (Phase 0 audit 결과로 채워짐):
- audit 매트릭스에서 P0 로 분류된 *viewer 범위* 기능 — Phase 0 통과 시 사용자 confirm 받은 항목만.
- 예시 후보 (PDFaid 등에서 자주 보임 — Phase 0 audit 가 최종 결정): page rotate (단일/전체), reorder pages, signature 영역, watermark 오버레이, 텍스트 추출(검색), 측정 도구 (ruler), 노트(sticky note), thumbnail navigator, 키보드 단축키 풀세트, 인쇄 미리보기, "find in PDF" 검색
- *변환/압축/병합/분할/OCR* 등은 *viewer 범위 외* — competitive-audit 의 *차집합* 에 사유 기록 (서버 책임 또는 후속 별도 plan)

**부채 회피 게이트** (반드시 박힘):
- 1000+ stroke 렌더 60fps 유지 (**PC + 태블릿 양쪽**)
- Eraser 10k segment < 16ms 처리
- 메인스레드 long-task 0 개
- a11y 회귀 0

**태블릿 환경 게이트 (USP 환경 제약)**:
- Galaxy Tab S9 FE+ 동등 기기에서 손가락 핀치 zoom + 2손가락 pan 60fps 깨끗 동작
- S Pen 압력 인식 + 손바닥 거치 (palm rejection) 동시 동작
- 회전·zoom 시 자유캔버스 (페이지 외 좌표) 좌표 변환 회귀 0

**자유 캔버스 게이트 (USP-4)**:
- 페이지 *밖* 좌표에 그린 stroke 가 저장·복원·undo·redo 모두 정상
- 자유캔버스 영역이 *작업이력 (USP-5)* 에 그대로 영속화

**Gate G4**: 위 *3개 게이트군 (부채 회피 + 태블릿 + 자유캔버스) 모두 통과* + manual freshness + Pre/Post-mortem 페어.

---

## Phase 5 — Host Integration + **Collaboration & Concurrent Editing (USP-2/3)** + Offline

**USP-2/3 코어 구현 — 후속이 아닌 *Phase 5 중심 트랙***:
- CRDT (Yjs / Automerge 중 ADR-0008 결정) 통합 — 모든 stroke·텍스트·도형 op 가 CRDT doc 로 표현
- WebSocket relay 또는 WebRTC peer-to-peer 동기화
- Presence — 다른 사용자 커서·선택 영역 시각화 (사용자별 색상)
- RBAC (ADR-0019) 구현 — viewer/commenter/editor/owner 권한 게이트
- 코멘트 스레드 + mention (선택 기능, P0/P1 결정은 audit 결과 따름)

**호스트 통합**:
- ADR-0009 postMessage 계약 구현 + contract test
- 호스트 임베드 데모 3종: vanilla HTML / React / Android WebView

**Offline + 영속성 (USP-5)**:
- IndexedDB + Service Worker + 충돌 해소 (CRDT 와 자연스럽게 통합)
- 작업이력 영구 저장 (메모리 한계 0) — undo/redo 세션 한계 없음
- 오프라인 30분 사용 후 동기화 0 손실 검증

**Gate G5**: contract test 통과 + offline 시나리오 통과 + 호스트 데모 3종 + **2 클라이언트 동시 편집 0 충돌** + presence 정상 + RBAC 권한 차단 정상.

---

## Phase 6 — Enterprise Plugin Surface + **위변조방지 (USP-1)**  (Private 레포)

**USP-1 코어 구현 — Enterprise 측에서 본격**:
- ADR-0017 위변조방지 아키텍처 — PKI 서명 (RSA/ECDSA), Merkle-like hash chain, append-only audit log
- Optional 블록체인 anchoring (Polygon / 또는 private chain) — 일정 주기로 audit chain root 를 chain 에 anchor
- OSS 측에는 *hash chain + audit log* 까지만, PKI·블록체인·HSM 은 Enterprise plugin

**일반 Enterprise**:
- Plugin contract 구현 (capability registry, lazy import)
- SSO / SAML, audit log dashboard, redaction-certified, DRM, HSM 서명
- *Public 레포에는 hook + 인터페이스만*, 구현은 private
- ESLint boundaries 룰로 OSS 빌드 시 enterprise import 차단

**Gate G6**: `pnpm build:oss` 단독 100% 동작 + `pnpm build:enterprise` 시 plugin 자동 로드 + 라이선스 키 검증 *enterprise 빌드 안에만* + **위변조 시도 시 hash chain 검증 실패 감지** + audit log tamper-evident.

---

## Phase 7 — Solutionization  (B2B/B2G 진입 준비)

**산출물**:
- 보안 인증 준비 — ISMS-P / GS 인증 1등급 / 공공 망분리 대응
- 접근성 인증 — WA 마크
- 견적 템플릿 (대기업 / 공공 / SMB 차등)
- SLA 정책 (등급별)
- 도입 reference deck (Phase 0 자산화한 것 발전)
- 보안성 검토 응답서 표준 (RFP 응답)
- Air-gap 빌드 (망분리 내부망 배포)

**Gate G7**: 견적 발송 가능 + 보안성 검토 응답서 1건 작성 가능 + 망분리 환경 동작 검증.

---

## 솔루션화 컨설팅 — 4 가지 강조

### (1) 부트스트랩 0→1 함정 회피 순서

**가장 흔한 솔로 자살 패턴**: "익숙한 스택으로 일단 짜자" → 6개월 후 "B2G 에서 못 쓰는 프레임워크였네" → 리라이트.

→ **Phase 0 (비즈니스) → Phase 1 (하네스) → Phase 2 (ADR burst) → Phase 3 (코드)** 순서 *잠금*. ADR-0003 프레임워크는 ADR-0009 호스트 통합 *이후*. 기존 부채 5종은 ADR-0004~0008 대안 비교 섹션에 *명시적 인용* 필수.

### (2) Open-core 경계 사전 설정

**ADR-0013 을 Phase 2 안에 박는다** — Phase 3 코드 시작 전.

- 원칙: 단일 사용자 가치 = OSS / 조직 운영·감사·규제 = Enterprise
- 구조: `packages/core` (Apache-2.0) + `packages/enterprise/*` (private submodule, commercial dual)
- Plugin contract: `Plugin<T>` interface + lazy import + capability registry. Phase 1 에서 미리 박힘.
- OSS 빌드 100% 단독 동작 보장 — `pnpm build:oss` 시 enterprise 경로 import 시 ESLint boundaries 룰로 *빌드 실패*.
- **상용 라이선스 키 검증조차 OSS 안에 두지 말 것** (CLA fork 회피).

### (3) B2B/B2G 솔로 솔루션화 *킬 위협* — plan 트랙으로 박힘

| 위협 | 진입 단계 | plan 트랙 |
|---|---|---|
| 보안 인증 (ISMS-P, GS 1등급, CC) | Phase 7, 3000만원+ | F-track Security |
| 접근성 (WA, WCAG 2.1 AA) | Phase 1 부터 axe CI 상시 | constraint A1 |
| 망분리·내부망 배포 (오프라인 빌드) | Phase 5 필수 | F-track Air-gap |
| 도입 reference (자기 인용 가능한 1곳) | Phase 0 게이트 | business/reference-tracker |
| Support SLA (1인이 24/7 불가) | Phase 7 (파트너 의존 or SLA 등급 차등 가격) | business-direction |
| 견적 협상력 (대기업·공공 후려치기) | Phase 0 가격 정책 + Phase 7 견적 템플릿 | business/pricing.md |
| 보안성 검토 응답서 (RFP 표준) | Phase 7 | docs/compliance/ |

### (4) 메뉴얼 자동 최신화 메커니즘 — 3단 강제

1. **`feature_list.schema.json` 에 `manual_impact` 필드 필수** — `"none"` 외 값인데 PR 에 `docs/manual/**` 변경 없으면 merge 차단 (validate-feature-list.ts 의 git diff 비교).
2. **MDX 기반 `docs/manual/`** — Storybook 도입 회피. 각 chapter 가 *진짜 컴포넌트 import* 해서 live 렌더.
3. **Playwright screenshot 자동화** — manual MDX 의 `<Screenshot story="..." />` 컴포넌트 스캔 → `public/manual/img/*` 갱신. `init.sh` `manual-freshness` 단계가 3일 이상 된 hash mismatch 시 fail.

Post-mortem 강제와 동등한 무게로 manual gate 박으면 "기능은 짰는데 매뉴얼이 6개월 뒤처짐" 사고를 *구조적으로* 차단.

---

## Critical Files (이식 / 참조)

**c3 에서 이식** (`<C3_ROOT>` 아래):
- `<C3_ROOT>/AGENTS.md` — 운영 헌법 (이식 후 PDF 어휘 substitute)
- `<C3_ROOT>/feature_list.schema.json` — 백로그 스키마 (manual_impact 필드 추가)
- `<C3_ROOT>/scripts/validate-feature-list.ts` — 7가지 cross-validation (manual diff 검증 추가)
- `<C3_ROOT>/init.sh` — 6단 검증 (a11y / boundaries / manual-freshness 단 추가)
- `<C3_ROOT>/docs/plans/README.md` — Plan-as-Code 가이드
- `<C3_ROOT>/docs/business-direction.md` — Live business doc 패턴 참조
- `<C3_ROOT>/docs/adr/` — ADR 16개 작성 스타일 참조

**기존 PDF 뷰어 자산** (`<LEGACY_VIEWER_ROOT>` 아래, "N/A" 면 skip):
- `<LEGACY_VIEWER_ROOT>/pdf_viewer_svelte/ARCHITECTURE.md` — 기존 구조 이해용
- `<LEGACY_VIEWER_ROOT>/pdf_viewer_svelte/CLAUDE.md` (있다면) — 옛 개발 가이드
- `<LEGACY_VIEWER_ROOT>/pdf_viewer_svelte/docs/` 폴더 — data-flow / factory-function-pattern / tech-stack-roadmap (전략 자료)
- `<LEGACY_VIEWER_ROOT>/pdf_viewer_svelte/src/lib/bridge/` — 호스트 통합 *과거 시도* (ADR-0009 의 input)
- `<LEGACY_VIEWER_ROOT>/pdf_viewer_svelte/src/lib/canvas/selectionResize.svelte.ts` — PowerPoint식 resize *알고리즘* (재구현 시 참조)
- `<LEGACY_VIEWER_ROOT>/pdf_viewer_svelte/src/lib/tools/eraserMode.svelte.ts` — centerline split *부채 인용*
- `<LEGACY_VIEWER_ROOT>/pdf_viewer_svelte/src/lib/interaction/viewPinchZoom.svelte.ts` — 태블릿 핀치/팬 *알고리즘* (ADR-0018 input)
- `<LEGACY_VIEWER_ROOT>/demo1/docs/40_Features/PDF_VIEWER_HISTORY.md` — 도메인 회고 (재현 필수 UX 식별 핵심)
- `<LEGACY_VIEWER_ROOT>/demo1/docs/40_Features/PDF_VIEWER_INFINITE_CANVAS.md` (있다면) — 자유 캔버스 컨셉 input

---

## 검증 (end-to-end)

**Phase 0 통과 시**: 사용자가 `docs/business-direction.md` 읽고 가설/경계/가격대 모두 confirm — "투자자에게 보낼 수 있는 수준" 자체 판단.

**Phase 1 통과 시**:
```bash
cd <INKVAS_ROOT>
./init.sh   # 6+α 단 모두 통과
git push    # 양 레포 (inkvas-core + inkvas-enterprise) 동기
ls docs/adr/ docs/plans/ docs/postmortems/   # 템플릿 + 초기 ADR 박힘
```

**Phase 2 통과 시**: ADR 12개 file lint 통과 + 각 파일에 `## 대안 비교` + `## 부채 인용` + `## risk_class` 섹션 박혀있음.

**Phase 3 통과 시**:
```bash
pnpm dev
# 브라우저 — sample.pdf 열림, 줌 0.5x~5x, 페이지 prev/next 통과
pnpm test:a11y   # Lighthouse 95+
pnpm test:manual-freshness   # 메뉴얼 차이 0
```

**Phase 4 통과 시**:
```bash
pnpm test:perf  # 1000 stroke 60fps + eraser 10k <16ms + long-task 0
pnpm test:e2e   # 펜·형광펜·지우개·텍스트·도형·선택·resize·회전·undo·redo 모두 통과
```

**Phase 5 통과 시**: 호스트 데모 3종 (vanilla/React/Android) 모두 contract test 통과 + 오프라인 30분 시나리오.

**Phase 6 통과 시**: `pnpm build:oss` 단독 동작 + `pnpm build:enterprise` plugin 자동 로드.

**Phase 7 통과 시**: 견적 발송 가능 (1 RFP 시나리오 응답 작성) + 망분리 환경 동작 검증.

---

## 후속 (out-of-scope — 본 plan 끝나면 별도 plan)

- ~~실시간 협업 (Yjs CRDT)~~ — **USP-2/3 으로 Phase 5 코어 승격됨**
- AI 어시스트 (OCR, 문서 요약, 자동 redaction)
- 다국어 i18n 풀세트
- 모바일 네이티브 SDK (iOS / Android — 현재 PC 브라우저 + 태블릿 웹뷰까지가 본 plan 스코프)
- 통계·분석 (B2B 고객사 대상 사용 패턴 리포트)
- 마켓플레이스 (third-party plugin 등록 + 검증)
- 블록체인 anchoring 의 *public chain* 비용 최적화 (Phase 6 에서 private chain 기본, public 은 후속)
- 자유캔버스 위 *임베디드 미디어* (이미지·동영상·외부 링크 anchor)

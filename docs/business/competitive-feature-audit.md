# Competitive Feature Audit (Live)

> Inkvas 의 *기능 매트릭스* SSOT. **Live 문서, 분기 갱신 필수.** `init.sh` 의 `audit-freshness` 단계가 last_updated 90일 이상이면 경고, 180일 이상이면 fail (ADR-0014 + bootstrap §Phase 1).
>
> 각 feature 의 `feature_list.json` 항목은 `audit_ref` 필드로 본 문서의 row 를 트레이서블 참조 (또는 `"original"`).

---

## Metadata

- last_updated: **2026-05-12** (Phase 0 초기 작성)
- next_review_due: **2026-08-12** (분기 1회)
- 1차 작성자: Claude Code 자율 진행 (사용자 G0 confirm 대상)
- 작성 한계: PDFaid·PSPDFKit·Foxit·Apryse 등 외부 사이트 실시간 크롤 없이 *공개 정보* + *bootstrap.md 명시* 기반 1차 박힘. 정밀 audit 은 사용자 confirm 후 *별도 트랙*.

---

## 0. 카테고리

| Category | 대상 | 비교 의미 |
|---|---|---|
| 무료 온라인 도구 | PDFaid (사용자 명시 요구), PDF24, iLovePDF, Smallpdf, Adobe Acrobat Online, PDF Candy, Sejda | 기능 *수* 와 *접근성* 의 표준 |
| B2B SDK | PSPDFKit / Nutrient, Foxit SDK, Apryse (前 PDFTron) | 기능 *깊이* + *임베드 호환성* + *가격* 의 표준 |
| OSS 뷰어 | Mozilla pdf.js + 뷰어, react-pdf, PDF.js Express (freemium) | OSS 라이선스 호환성 + 기술 부채 입력 |

---

## 1. PDFaid 전수 분석 (사용자 명시 요구)

PDFaid (`https://www.pdfaid.com/`) 사이트의 *모든 편집 화면 기능* 1차 항목화. 우리 viewer 솔루션 범위와 *교집합·차집합* 명시.

> ⚠️ 본 절은 *공개 사이트 추정* 기반 드래프트. 사용자 G0 confirm 단계에서 사이트 직접 방문으로 검증 후 보강 필요.

### PDFaid 기능 카탈로그 (드래프트)

| # | 기능 | 카테고리 | 우리 viewer 범위 | 도입 후보 |
|---|---|---|---|---|
| 1 | PDF to Word/Excel/PPT 변환 | 변환 | **차집합** | 미도입 — *서버 책임, viewer 범위 외* |
| 2 | Word/Image/HTML → PDF 변환 | 변환 | **차집합** | 미도입 |
| 3 | PDF 압축 (compress) | 압축 | **차집합** | 미도입 — viewer 책임 아님 |
| 4 | PDF 병합 (merge) | 페이지 조작 | △ 경계 | Backlog — *복수 PDF 동시 표시* 는 Phase 후속 plan |
| 5 | PDF 분할 (split) | 페이지 조작 | △ 경계 | Backlog — *뷰어 내 페이지 추출* 은 Phase 후속 |
| 6 | 페이지 회전 (rotate) | 페이지 조작 | **교집합** | **P0 후보** — Phase 4 재현 필수 UX |
| 7 | 페이지 삭제 (delete pages) | 페이지 조작 | △ 경계 | Backlog — *읽기 전용 viewer 가 원본을 수정* 하는 행동, RBAC + 위변조방지와 충돌 가능 → ADR 필요 |
| 8 | 페이지 추가·재정렬 (reorder) | 페이지 조작 | △ 경계 | Backlog — 위와 동일 |
| 9 | 이미지 추출 (extract images) | 콘텐츠 추출 | △ 경계 | Backlog |
| 10 | 텍스트 추출 (extract text) | 콘텐츠 추출 | **교집합** | **P1 후보** — 검색 기능 의 입력 |
| 11 | PDF 텍스트 검색 (find in PDF) | 뷰어 | **교집합** | **P0 후보** — Phase 4 |
| 12 | PDF 폼 채우기 (form fill) | 뷰어 + 입력 | **교집합** | **P1 후보** — Phase 5+ |
| 13 | PDF 서명 (e-sign) | 보안 | **교집합** | **P0 후보 (USP-1 연계)** — Phase 4~6 |
| 14 | 워터마크 추가 | 어노 + 보안 | **교집합** | **P1 후보** — Phase 4 (오버레이 어노) |
| 15 | OCR (스캔 PDF 텍스트화) | 변환 + AI | **차집합** | 미도입 — *별도 AI 트랙* (out-of-scope 후속 plan) |
| 16 | Redaction (검정칠 마스킹) | 보안 | **교집합** | **P0 (Enterprise) 후보** — Phase 6, certified redaction 필요 |
| 17 | PDF 암호 설정/해제 | 보안 | △ 경계 | Backlog — *Enterprise 트랙* |
| 18 | PDF 메타데이터 편집 | 메타 | △ 경계 | Backlog |
| 19 | 노트·sticky note 어노 | 어노 | **교집합** | **P0 후보** — Phase 4 |
| 20 | 형광펜·언더라인 | 어노 | **교집합** | **P0 (재현 필수)** — Phase 4 |
| 21 | 펜·자유 드로잉 | 어노 | **교집합** | **P0 (재현 필수, USP-4 연결)** — Phase 4 |
| 22 | 도형 (사각·원·직선) | 어노 | **교집합** | **P0 (재현 필수)** — Phase 4 |
| 23 | 측정 도구 (ruler/area) | 어노 | **교집합** | **P1 후보** — Phase 4+ |
| 24 | 썸네일 사이드바·페이지 네비 | 뷰어 | **교집합** | **P0 (재현 필수)** — Phase 4 |
| 25 | 인쇄 미리보기 | 뷰어 | **교집합** | **P1 후보** — Phase 4 |
| 26 | 키보드 단축키 풀세트 | UX + a11y | **교집합** | **P0 (a11y 게이트 연계)** — Phase 1~4 |

> **차집합 사유 표준화**: "변환·압축·OCR 등은 *서버 책임, viewer 범위 외*. Inkvas 의 viewer scope 는 *읽기 + 어노테이션 + 자유 캔버스 + 위변조 보존* 4축에 집중. 변환 트랙은 후속 별도 plan 의 *서비스* 로 분리 (라이선스 / 호스팅 / 모델 별도 결정 필요)."

---

## 2. 경쟁사별 기능 매트릭스 (드래프트)

| # | 기능 | PDFaid | PDF24 | iLovePDF | Smallpdf | Adobe Online | PSPDFKit | Foxit SDK | Apryse | pdf.js | **Inkvas 도입 후보** | **우선순위** | Phase 매핑 | 차별화 / 모방 |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | PDF 렌더 + zoom/pan | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | **Y** | P0 | Phase 3 | 모방 (필수) |
| 2 | 페이지 회전 (UI) | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | △ | **Y** | P0 | Phase 4 | 모방 |
| 3 | 펜·형광펜·도형 어노 | △ | △ | △ | △ | ◯ | ◯ | ◯ | ◯ | ✕ | **Y** | P0 | Phase 4 | 모방 (재현 필수) |
| 4 | sticky note 어노 | ✕ | ✕ | ✕ | ✕ | ◯ | ◯ | ◯ | ◯ | ✕ | **Y** | P0 | Phase 4 | 모방 |
| 5 | 텍스트 검색 (find in PDF) | ◯ | ◯ | ✕ | ✕ | ◯ | ◯ | ◯ | ◯ | ◯ | **Y** | P0 | Phase 4 | 모방 |
| 6 | 인쇄 미리보기 | △ | ◯ | △ | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | **Y** | P1 | Phase 4 | 모방 |
| 7 | 페이지 회전 (저장) | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ✕ | Backlog | P2 | Phase 5+ | 모방 (RBAC + 위변조 분리 필요) |
| 8 | 페이지 reorder/delete | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ✕ | Backlog | P2 | 후속 | ADR 필요 — RBAC + USP-1 충돌 가능 |
| 9 | PDF 변환·압축·OCR | ◯ | ◯ | ◯ | ◯ | ◯ | △ | △ | △ | ✕ | **N** | — | 후속 별도 plan | 의도적 미도입 |
| 10 | redaction (검정칠) | △ | ✕ | ✕ | △ | ◯ | ◯ | ◯ | ◯ | ✕ | **Y (Enterprise)** | P0 | Phase 6 | 모방 + certified |
| 11 | 워터마크 오버레이 | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ◯ | ✕ | **Y** | P1 | Phase 4 | 모방 |
| 12 | e-sign (서명 영역) | ◯ | △ | △ | ◯ | ◯ | ◯ | ◯ | ◯ | ✕ | **Y** | P0 | Phase 4+ (USP-1) | 모방 + 위변조 연계 |
| 13 | PKI 디지털 서명 (검증) | ✕ | ✕ | ✕ | ✕ | ◯ | ◯ | ◯ | ◯ | ✕ | **Y (Enterprise)** | P0 | Phase 6 | 모방 |
| 14 | **위변조 hash chain + audit log** | ✕ | ✕ | ✕ | ✕ | △ | △ | △ | △ | ✕ | **Y (USP-1 코어, OSS)** | P0 | Phase 6 | **차별화** |
| 15 | **블록체인 anchoring** | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | **Y (Enterprise)** | P1 | Phase 6 | **강한 차별화** |
| 16 | **자유 캔버스 (페이지 외부)** | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | △ | ✕ | **Y (USP-4 코어)** | P0 | Phase 4 | **강한 차별화** |
| 17 | **실시간 동시작업 (CRDT)** | ✕ | ✕ | ✕ | ✕ | ◯ | ◯ | ◯ | ◯ | ✕ | **Y (USP-3 코어)** | P0 | Phase 5 | 모방 + OSS 차별화 |
| 18 | **권한·역할 (RBAC)** | ✕ | ✕ | ✕ | ✕ | ◯ | ◯ | ◯ | ◯ | ✕ | **Y (USP-2 코어)** | P0 | Phase 5 | 모방 |
| 19 | **오프라인 30분 → 동기 0 손실** | ✕ | ✕ | ✕ | ✕ | △ | △ | △ | △ | ✕ | **Y (USP-5 코어)** | P0 | Phase 5 | **차별화** |
| 20 | **태블릿 (S Pen) 60fps** | △ | △ | △ | △ | ◯ | ◯ | △ | △ | △ | **Y (ADR-0018)** | P0 | Phase 3~ 상시 | **차별화 (사용자 환경 제약)** |
| 21 | SSO / SAML / LDAP | ✕ | ✕ | ✕ | △ | ◯ | ◯ | ◯ | ◯ | ✕ | **Y (Enterprise)** | P0 | Phase 6 | 모방 |
| 22 | 망분리·air-gap 빌드 | ✕ | ✕ | ✕ | ✕ | △ | △ | ◯ | ◯ | ✕ | **Y (Enterprise)** | P0 | Phase 7 | 모방 (B2G 필수) |
| 23 | WCAG 2.1 AA 인증 | ✕ | ✕ | ✕ | △ | ◯ | ◯ | △ | ◯ | △ | **Y** | P0 | Phase 1~ 상시 | 모방 (B2G 필수) |
| 24 | CJK 폰트 풀세트 | △ | △ | △ | △ | ◯ | ◯ | ◯ | ◯ | △ | **Y (ADR-0011)** | P0 | Phase 3+ | 모방 (한국 시장 필수) |
| 25 | 호스트 임베드 (postMessage / iframe) | ✕ | ✕ | ✕ | △ | ◯ | ◯ | ◯ | ◯ | △ | **Y (ADR-0009)** | P0 | Phase 5 | 모방 |
| 26 | 가격 transparency (OSS 코어) | freemium | freemium | freemium | freemium | enterprise | enterprise | enterprise | enterprise | OSS | **Y (Apache-2.0)** | P0 | Phase 0 | **강한 차별화** |

### 도입 우선순위 요약 (G0 confirm 대상)

| 우선순위 | 항목 |
|---|---|
| **P0 (Phase 3~4 필수)** | #1 렌더, #2~#6 + #11~#12 어노/회전/검색, #14·#16·#19~#20 차별화 핵심, #23·#24 a11y/CJK, #25 호스트 임베드, #26 가격 |
| **P0 (Phase 5)** | #17 CRDT, #18 RBAC |
| **P0 (Phase 6, Enterprise)** | #10·#13·#15·#21 redaction/PKI/블록체인/SSO |
| **P0 (Phase 7, Enterprise)** | #22 air-gap |
| **P1** | #6 인쇄, #11 워터마크 |
| **Backlog** | #7·#8 페이지 reorder/delete (ADR 필요) |
| **의도적 미도입** | #9 변환·압축·OCR (서버 책임) |

---

## 3. 차집합 (의도적 미도입) 사유 요약

| 미도입 기능 | 사유 |
|---|---|
| PDF → Word/Excel/PPT 변환 | 서버 책임. viewer scope 가 아니다. 후속 *별도 변환 서비스* plan 으로 분리. |
| PDF 압축 | 동일 — 서버 책임. |
| OCR | AI 트랙 별도. 모델·라이선스·호스팅 결정 필요 → 후속 plan. |
| PDF → 이미지/HTML | 변환 트랙 동일. |
| 페이지 추가·재정렬·삭제 (기본) | RBAC + USP-1 (위변조 hash chain) 와 충돌 가능 — *원본 변조* vs *어노 추가* 의 의미적 경계 필요. ADR 필요 (Phase 5+). |

---

## 4. 갱신 가이드

- 분기 1회 (`next_review_due` 기준) 본 audit 갱신.
- 갱신 시 last_updated + last_checked (경쟁사별) 두 필드 모두 update.
- `feature_list.json` 의 `audit_ref` 가 본 매트릭스 row # 를 참조 — 갱신으로 row # 변경 시 `feature_list.json` 동시 update.
- 갱신 PR 은 `manual_impact: "section"` 이상이면 `docs/manual/competitive-context.mdx` 동시 update (ADR-0014).

---

## 5. 변경 이력

| 일자 | 변경 | last_checked (사이트별) |
|---|---|---|
| 2026-05-12 | 초안 작성 (PDFaid 26항목 + 9 경쟁사 26 row 매트릭스) | PDFaid·PSPDFKit·Foxit·Apryse·Adobe Online — *공개 정보 추정* (실제 사이트 호출 없음) |

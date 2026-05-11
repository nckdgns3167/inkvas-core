# AGENTS.md — Inkvas (Ink + canvas)

> 이 문서는 Inkvas 프로젝트의 헌법이다. AI 에이전트와 사람 모두 작업 시작 전에 이 문서를 읽는다.
> 변경은 [git log](.) 커밋 단위로만 이루어진다.

---

## 0. 문서 구조 (SSOT)

Inkvas 하네스는 역할별로 SSOT(Single Source of Truth)를 분리한다. 한 정보의 진실은 _단 하나의_ 위치에서만 정의되며, 같은 정보를 두 군데에 두지 않는다.

| SSOT | 역할 |
|---|---|
| **AGENTS.md** (이 파일) | 운영 규칙·19개 비타협 제약·작업 절차 |
| **`feature_list.json`** | 백로그·작업 상태·WIP 정책·라이선스 tier·메뉴얼 영향 |
| **`DESIGN.md`** | 시각/UX 의도 — colors, typography, spacing, components, do's & don'ts |
| **`docs/adr/`** | 비타협 _결정 근거_ (Context / Decision / Consequences / Alternatives Considered) |
| **`docs/plans/`** | _실행 계획_ 영구화 (Plan-as-Code, ADR-0002). frontmatter + Pre-mortem + Post-mortem 강제, supersede 체인 |
| **`docs/postmortems/`** | _사건 회고_ (Blameless, 5 Whys, action items 백로그 통합 — ADR-0012). `YYYY-MM-DD-<title>.md` |
| **`docs/manual/`** | 사용자 메뉴얼 (MDX live import, ADR-0014). 기능 PR 의 `manual_impact` 필드와 정합 강제 |
| **`docs/glossary.md`** | 용어 사전 (사용자 학습 누적) |
| **`docs/business-direction.md`** | 사업 방향성·정책 SSOT (Live 갱신) |
| **`docs/business/competitive-feature-audit.md`** | 경쟁사 기능 매트릭스 (Live, 분기 갱신, `audit_ref` 필드와 트레이서블) |
| **`docs/business/usp.md`** | USP 5종 SSOT (Live, 분기 갱신) |
| **`docs/business/license-boundary.md`** | OSS ↔ Enterprise 분류표 (ADR-0013 input) |
| **`docs/business/reference-tracker.md`** | 도입 사례 자산화 (SmartOn / 가스피아 etc.) |
| **`docs/compliance/`** | 보안성 검토 응답·인증 (Phase 7 채워짐) |
| **`git log`** | 작업 완료(`done`) 이벤트의 진실 |

`CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md` 등 *에이전트별 메모리 파일*은 모두 위 SSOT를 가리키는 stub이며, 규칙을 중복 정의하지 않는다.

**GitHub Milestones**는 SSOT가 _아니라_ Phase 게이팅의 시각적 그룹핑이다 — 백로그는 항상 `feature_list.json`. **GitHub Issues 백로그·Projects 칸반보드·Wiki는 의도적으로 사용하지 않는다** — DRY 위반과 SSOT 분산을 방지.

### 0.1 ADR 인덱스

비타협 결정은 `docs/adr/`에 ADR 형식으로 영구화된다. 19개 제약은 *결과*이고 ADR이 *사유*를 보존한다. 새 비타협 결정을 도입하는 PR은 ADR 추가 필수.

- ADR-0000 — 프로젝트 정체성: Inkvas
- ADR-0001 — 레포 토폴로지 (monorepo + submodule vs 분리 2 레포 vs pnpm workspace)
- ADR-0002 — Plan-as-Code (docs/plans/ for Plan Versioning, c3 ADR-0010 port)
- ADR-0003 — 프레임워크 (Svelte / React / Lit / Web Components, ADR-0009 결정 *후* 박힘)
- ADR-0004 — PDF 렌더링 (pdf.js / PDFium WASM / 서버 raster)
- ADR-0005 — 어노테이션 엔진 + 자유 캔버스 좌표계 (USP-4 코어)
- ADR-0006 — OffscreenCanvas + Worker pool (성능 부채 회피)
- ADR-0007 — Eraser 알고리즘 (centerline split / BVH-tree / RBush)
- ADR-0008 — Persistence + 협업·동시작업 (CRDT, USP-2/3/5)
- ADR-0009 — Host integration contract (postMessage / window.pdfv / Android JS bridge / iOS)
- ADR-0010 — WCAG 2.1 AA / Section 508 / ADA
- ADR-0011 — CJK 폰트 서브세팅·다국어 fallback
- ADR-0012 — Retro & Postmortem 정책 (Plan-as-Code 통합, Pre-mortem ↔ Post-mortem 페어링, c3 ADR-0013 port)
- ADR-0013 — Open-core 경계 (Plugin contract + capability registry + ESLint boundaries)
- ADR-0014 — Manual freshness gate (MDX live import + Playwright screenshot diff + init.sh 단)
- ADR-0015 — Cross-review (Codex/Gemini) critical/mid plan PR gate (c3 ADR-0014 port)
- ADR-0016 — Security baseline (SBOM + signed builds + CVE 모니터링)
- ADR-0017 — 위변조방지 아키텍처 (USP-1, OSS: hash chain + audit log / Enterprise: PKI + 블록체인)
- ADR-0018 — 태블릿 입력·성능 표준 (Galaxy Tab S9 FE+ 동등 60fps 상시 게이트)
- ADR-0019 — 권한·역할 모델 (RBAC, USP-2 코어)

각 ADR이 적용되는 제약은 Section 4의 각 제약 헤딩 옆에 `[ADR-XXXX]` 태그로 표시.

---

## 1. 프로젝트 정의

**Inkvas (Ink + (can)vas)** — PDF 어노테이션 · 자유 캔버스 · 협업 · 위변조방지 · 영속성 *4축 결합* 솔루션.

- **사업 가설**: 4축 결합 = 시장에 *현존하지 않는* 조합 (USP-1·2·3·4·5)
- **운영 형태**: 1인 개발자 + AI 에이전트 위임 체제
- **타깃**: B2B / B2G × 대기업 / SMB·공공 4사분면
- **라이선스**: Open-core (Apache-2.0) + Enterprise (commercial dual)
- **환경 제약 (불변)**: PC 브라우저 + 태블릿 (Galaxy Tab S9 FE+ 동등) 60fps. 모든 Phase Gate 에서 *태블릿 회귀 0* [ADR-0018].

세부: `README.md`, `docs/business-direction.md`, `docs/plans/0001-bootstrap-from-zero.md`.

## 2. 용어 정의

이 문서와 코드베이스 전반에서 일관되게 사용한다.

- **어노테이션 (Annotation)**: 사용자가 PDF 위·외부에 그린 stroke·도형·텍스트·sticky note 등 모든 마크업 entity 총칭.
- **자유 캔버스 (Infinite Canvas)**: PDF 페이지 *외부* 좌표 영역. 페이지 = 고정 transform 인 무한 평면 위 객체. USP-4 코어.
- **위변조방지 (Integrity)**: 어노테이션의 *순서*·*내용*·*행위* 가 hash chain + (Enterprise) PKI 로 변조 차단. USP-1.
- **CRDT (Conflict-free Replicated Data Type)**: 동시 편집에서 *수렴* 보장하는 자료구조. Yjs / Automerge 등. USP-3 코어.
- **RBAC (Role-Based Access Control)**: viewer / commenter / editor / owner 4종 기본 권한 모델. USP-2 코어. [ADR-0019]
- **OSS 코어 / Enterprise**: `inkvas-core` (Apache-2.0) ↔ `inkvas-enterprise` (commercial dual). 경계는 [`docs/business/license-boundary.md`](docs/business/license-boundary.md) + [ADR-0013].
- **호스트 (Host)**: Inkvas 가 임베드되는 *외부 페이지·앱*. 브라우저 (iframe / Web Component) / Android (WebView + JS bridge) / iOS (WKWebView + WKMessageHandler). [ADR-0009]
- **메뉴얼 영향 (manual_impact)**: 각 feature 가 사용자 메뉴얼에 미치는 영향. `"none" | "section" | "new-chapter"`. `"none"` 외 값이면 PR 에 `docs/manual/**` 변경 필수. [ADR-0014]
- **audit_ref**: 각 feature 가 competitive-audit 매트릭스의 어느 row 에서 유래했는지 (또는 `"original"`). audit 갱신 시 feature 재방문 트레이서블.

## 3. 운영 원칙

### 3.1 WIP = 1

`feature_list.json`의 `wip_policy.max_in_progress: 1`은 절대값이다.

- 새 작업 시작 시 `status: "in_progress"`인 feature가 없어야 함
- 차단(blocker) 발생 시 `paused`로 전환하되 **반드시 `reason` 기록**
- 다른 작업으로 옮긴 뒤 영원히 안 돌아오는 패턴을 하네스가 막는다

`wip_lock: false`인 feature(의존성 업데이트, 보안 패치 등 메타 작업)는 WIP 카운트에서 제외된다.

### 3.2 init.sh 게이팅

`./init.sh` 통과 없이는 코드 수정 자체를 시작하지 않는다. 6+α 단:

1. 의존성 설치 (`pnpm install --frozen-lockfile`)
2. 타입체크 (`pnpm typecheck`)
3. 린트 + ESLint `boundaries` (OSS↔Enterprise import 차단) — [ADR-0013]
4. 단위 테스트 (`pnpm test`)
5. 마이그레이션 dry-run (DB 도입 후 활성)
6. `feature_list.json` 스키마 검증 (`pnpm validate:features`)
7. **a11y axe (WCAG 2.1 AA)** — Phase 3+ 활성 [ADR-0010]
8. **manual-freshness 검사** — `manual_impact` ≠ `"none"` PR 에 메뉴얼 변경 누락 시 fail [ADR-0014]
9. **audit-freshness 검사** — `competitive-feature-audit.md` last_updated 90일 이상 시 경고, 180일 이상 시 fail

실패 시 비영(non-zero) 종료. CI도 동일 스크립트 호출. Phase 1 시점에는 일부 단계가 *placeholder* (Phase 3+ 활성).

### 3.3 ACID 커밋 + Pass-state Gating

1 논리 작업 = 1 원자적 커밋. 모든 게이트 통과 후에만 커밋 허용.

- **1차 게이트**: husky + lint-staged (커밋 자체를 차단)
- **2차 게이트**: GitHub Actions
- **커밋 컨벤션**: `feat: F-007 Eraser BVH-tree 도입` 형태로 feature ID 명시 → `active_history`의 `done` 이벤트 대용

### 3.4 작업 시작 전 체크리스트

1. `./init.sh` 통과 확인
2. `feature_list.json`에서 다음 작업 후보 선정 (`status: "planned"` + `depends_on` 모두 `done`)
3. 해당 feature의 `applies_constraints` 항목을 이 문서에서 다시 정독
4. 해당 feature `status`를 `in_progress`로 갱신 + `active_history`에 `started` 이벤트 append
5. **plan frontmatter `risk_class` 분류** (ADR-0015 — critical/mid/easy) + critical/mid 시 PR + Cross-review 트리거 → plan 안 `## Cross-review` 섹션에 결과 박음 (Convergence/Divergence/단독 catch). easy는 skip.
6. `acceptance.verifiable.tests`에 명시된 테스트 파일 **먼저 작성** (TDD 강제)
7. 구현
8. `init.sh` 통과 확인 → `git commit` (메시지에 feature ID 포함)
9. **plan Post-mortem 섹션 작성** (feature `done` 처리 _전_, ADR-0012) — 추정 vs 실제 / 잘된 것 / 어려웠던 것 / 다음 feature에 가져갈 것 / 백로그 영향. 5~10줄. `validate-feature-list.ts`가 done 시 비어있지 않음 검증.
10. **`manual_impact` 처리** — `"none"` 외 값이면 `docs/manual/**` 변경 동시 commit. `init.sh` manual-freshness 가 git diff 비교로 검증 [ADR-0014].
11. `feature_list.json`의 `status`를 `in_progress` → `done` 처리 + 두 번째 commit (메타 type `chore:` 권장)

---

## 4. Constraints

> 이 섹션의 ID는 `feature_list.json`의 `applies_constraints`가 참조한다.
> 모든 feature가 19개 제약 전부를 따라야 하지만, `applies_constraints`는 _특히 위반 위험이 큰_ 항목을 가이드로 명시한다.

### A. 라이선스 & 경계

**A1. Apache-2.0 OSS 코어 invariance.** [ADR-0013]
`inkvas-core` 의 모든 코드는 Apache-2.0 호환. 상용 라이선스 키 검증 코드조차 OSS 안에 두지 말 것 (CLA fork 회피). 검증: ESLint `boundaries` 룰로 enterprise 경로 import 차단 + `pnpm build:oss` 단독 100% 동작 CI 게이트.
_Why: OSS 코어의 영원한 OSS 약속 (사업 약속 §7). 위반 시 사용자 신뢰 + 컴플라이언스 동시 손실._

**A2. legacy assets 격리.**
`inkvas-legacy-assets/` 는 *참조만*, commit 금지. `.gitignore` 강제. 검증: pre-commit 훅에서 `inkvas-legacy-assets/` 경로 변경 차단.
_Why: 옛 pdf_viewer_svelte 라이선스 불명 + Apache-2.0 코어 라이선스 혼선 차단._

**A3. license-boundary 트레이서블.** [ADR-0013]
각 feature 의 `feature_list.json` 항목은 `license_tier: "oss" | "enterprise"` 필드 필수. enterprise feature 는 `packages/enterprise/*` 경로에만 박힘. 검증: validate-feature-list.ts 의 경로/tier 정합 cross-validation.
_Why: 경계가 코드 위치 + 메타데이터 양쪽에 박혀야 ESLint + 사람 양쪽 검증 가능._

### B. 성능 & 환경

**B4. 태블릿 60fps 회귀 0.** [ADR-0018]
Galaxy Tab S9 FE+ 동등 기기에서 손가락 핀치 zoom + 2손가락 pan + S Pen 압력 입력 60fps 깨끗 동작. Phase 3 부터 *모든 Phase 게이트*. 회전·zoom 시 자유캔버스 좌표 변환 회귀 0.
_Why: 사용자 명시 환경 제약. 한국 시장 진입에 *불변 입력*._

**B5. Long-task 0.** [ADR-0006]
메인스레드 long-task (>50ms) 0개. 무거운 작업은 OffscreenCanvas + Worker pool 로 offload. 검증: Playwright + Long Tasks API.
_Why: 옛 viewer paper.js 메인스레드 직렬화 부채 재발 차단._

**B6. Memory budget.** [ADR-0004]
큰 PDF (>100MB) 메모리 사용 < 500MB. stream 렌더 + 페이지 unload 강제. 검증: Playwright + Performance.memory API + 100MB 샘플.
_Why: 옛 viewer 큰 PDF 메모리 부담 부채 재발 차단._

### C. 데이터 & 보안

**C7. 어노테이션 변조 차단.** [ADR-0017, USP-1]
모든 stroke·op 가 hash chain (Merkle-like, 이전 stroke hash 가 다음에 포함) 의 input. append-only audit log. 변조 시도는 검증 단계에서 즉시 감지 (100%). Phase 5+ 활성, Phase 6 PKI/블록체인 추가.
_Why: B2G·금융·법무 필수. 위변조 발견 시 검증 자체가 실패해야 함._

**C8. 작업이력 영속.** [ADR-0008, USP-5]
모든 어노 op 가 IndexedDB + 서버 sync. 메모리 only 폐기 *금지*. undo/redo 세션 한계 없음. 사용자 작업 손실 0. 오프라인 30분 → 재접속 0 손실 검증 (Phase 5).
_Why: 옛 viewer 메모리 only 부채 재발 차단 + USP-5 코어._

**C9. 시크릿 zod.** [ADR-0001~]
환경변수는 `lib/env.ts` 에서 zod 검증 후 export. `.env*` git 추적 제외. 코드 안 키·토큰 하드코딩 금지. 검증: gitleaks 또는 secretlint pre-commit.
_Why: 솔로 운영자에게 가장 비싼 사고. 1인이 권한·시크릿 사고 만들 가능성을 빌드 타임에 차단._

**C10. 호스트 origin 검증.** [ADR-0009]
postMessage 통신은 `event.origin` 화이트리스트 검증 필수. window.pdfv JS API + Android JS bridge + iOS WKMessageHandler 모두 origin 또는 namespace 검증 후 처리. 검증: contract test (Playwright + 임의 origin 시뮬레이션).
_Why: 임베드 환경에서 호스트 신뢰 경계 명시. 옛 viewer 단편 prop 조합 폭발 부채 회피._

### D. 무결성 & 운영

**D11. DB 마이그레이션 append-only.**
`DROP`, `RENAME`, 컬럼 타입 변경은 (a) 데이터 백업 마이그레이션 선행 + (b) 파일명에 `MIGRATION_DESTRUCTIVE` 플래그 명시 시에만 허용.
_Why: 에이전트가 마이그레이션을 만들 때 가장 자주 일으키는 사고가 무신경한 데이터 파괴._

**D12. WCAG 2.1 AA / Section 508 / ADA.** [ADR-0010]
Lighthouse a11y 95+ 상시 게이트. 키보드 단축키 풀세트. 스크린리더 호환. Phase 3 부터 모든 PR.
_Why: B2G 필수. WA 마크 인증 트랙 (Phase 7) 의 baseline._

**D13. CJK 폰트 fallback.** [ADR-0011]
한국어·중국어·일본어 PDF 깨짐 0. 폰트 서브세팅 + fallback chain. 검증: 한·중·일 샘플 PDF 100% pass.
_Why: 한국 시장 진입 필수. 옛 viewer 의 텍스트 회귀 부채 재발 차단._

**D14. Manual freshness gate.** [ADR-0014]
`feature_list.json` 의 `manual_impact` 필드 ≠ `"none"` 인 PR 은 `docs/manual/**` 변경 필수. MDX live import + Playwright screenshot diff. `init.sh` `manual-freshness` 단이 git diff 비교로 검증. 3일 이상 hash mismatch 시 fail.
_Why: "기능은 짰는데 매뉴얼이 6개월 뒤처짐" 사고를 *구조적* 차단. Post-mortem 강제와 동등한 무게._

**D15. competitive-audit freshness.**
`docs/business/competitive-feature-audit.md` 의 last_updated 90일 이상 경고, 180일 이상 fail. `feature_list.json` 의 `audit_ref` 필드로 트레이서블. 갱신 시 영향 받은 feature 재방문.
_Why: 분기 1회 시장 갱신 = 솔로 개발자가 시장 변화 놓치지 않는 *구조적 강제*._

### E. 협업 & 동시성

**E16. CRDT 호환성.** [ADR-0008, USP-3]
모든 어노 entity 가 CRDT op (Yjs / Automerge) 표현 가능. 직렬화 / 역직렬화 round-trip 손실 0. 2 클라이언트 100 stroke 동시 = 0 충돌 (E2E).
_Why: 후속 추가가 아닌 *코어 동시 설계*. 추후 협업 도입 시 entity 모델 변경 = 마이그레이션 폭발._

**E17. RBAC 게이트.** [ADR-0019, USP-2]
viewer / commenter / editor / owner 4종 기본 권한 모델. 모든 어노 op 가 권한 확인 후 적용 (E2E). Enterprise 측에서 페이지별·도구별·시간 한정 custom role 확장.
_Why: 협업의 신뢰 경계. RBAC 누락 시 후속 보강 = 모든 op 경로 재작성._

### Phase 6+ 별첨 (Enterprise 활성)

> 이 두 제약은 OSS 코어에는 *비활성*이지만, Enterprise plugin 도입 PR 이 처음 들어오는 순간 자동 활성화되도록 `feature_list.json` 안에서 의존성으로 묶여 있다.

**P6-1. PKI 서명 키 보호.** [ADR-0017]
PKI 서명 (RSA/ECDSA) 키는 HSM (PKCS#11/KMIP) 통해서만 접근. 코드 안 평문 키 하드코딩 금지. 인증서 chain 검증 (X.509) 정확도 100% (CRL/OCSP).
_Why: B2G 보안 인증 (ISMS-P / GS 1등급) 의 baseline._

**P6-2. 망분리 빌드 검증.** [ADR-0016]
air-gap 환경 (외부 npm registry 차단) 에서 빌드 0 의존성 누락. pre-installed offline mirror 만 사용. Phase 7 진입 전 검증.
_Why: 공공·금융 망분리 RFP 응답 필수. 진입 단계에서 의존성 누락 발견 = 영업 사이클 폭발._

### 자동 검증 매트릭스

| 검증 방식 | 제약 ID |
|---|---|
| 자동 (린터/타입체커/빌드) | A1, A2, A3, C9, D14, D15 |
| 자동 (런타임·E2E) | B4, B5, B6, C7, C8, C10, D12, D13, E16, E17 |
| 코드 리뷰·수동 검증 | D11, P6-1, P6-2 |

15/19 자동 검증 가능 (Phase 3+ 활성 포함). 자동 검증 항목은 에이전트가 어기는 즉시 피드백 루프가 작동한다.

---

## 5. 파일 시스템 컨벤션

> 두 레포 토폴로지는 [ADR-0001] 에서 결정. 본 절은 *Phase 1 시점 기준* 레이아웃.

```
inkvas/                                  # inkvas-core 레포 (Apache-2.0, public)
├── AGENTS.md                            # 이 파일 — 헌법
├── README.md
├── LICENSE                              # Apache-2.0
├── DESIGN.md                            # 시각/UX SSOT
├── feature_list.json                    # 백로그 SSOT
├── feature_list.schema.json             # 위 파일 검증 JSON Schema
├── claude-progress.md                   # 세션 인수인계 (Phase 2+ 도입)
├── init.sh                              # 환경 건전성 검사 (6+α 단)
├── package.json                         # 하네스 + (Phase 3+) 제품 deps
├── pnpm-lock.yaml
├── tsconfig.json
├── .gitignore                           # inkvas-legacy-assets/ 차단 필수 [A2]
├── inkvas-legacy-assets/                # 참조만, .gitignore 격리 [A2]
│   ├── pdf_viewer_svelte/
│   └── demo1-docs/40_Features/
├── .claude/
│   ├── settings.json                    # 공유 권한 (commit 대상)
│   └── settings.local.json              # local-only (.gitignore)
├── docs/
│   ├── adr/                             # ADR-0000~0019
│   ├── plans/                           # Plan-as-Code [ADR-0002]
│   ├── postmortems/                     # Blameless 회고 [ADR-0012]
│   ├── manual/                          # 사용자 메뉴얼 MDX [ADR-0014]
│   ├── compliance/                      # Phase 7 보안성 검토 응답
│   ├── glossary.md
│   ├── business-direction.md
│   └── business/
│       ├── competitive-feature-audit.md
│       ├── usp.md
│       ├── license-boundary.md
│       └── reference-tracker.md
├── scripts/
│   ├── validate-feature-list.ts         # 12+α cross-validation
│   └── competitive-audit-refresh.ts     # last_updated 갱신 검증
├── packages/                            # Phase 3+ 제품 코드 (workspace, [ADR-0001])
│   ├── core/                            # @inkvas/core (Apache-2.0)
│   ├── host-vanilla/                    # @inkvas/host-vanilla
│   ├── host-react/                      # @inkvas/host-react
│   └── ...                              # (호스트별 어댑터, [ADR-0009])
└── e2e/                                 # Playwright 회귀 (Phase 4+)
```

별도 레포: `inkvas-enterprise` (private, commercial dual) — SSO/SAML, HSM, 블록체인 anchoring, redaction-certified, air-gap. *Public 레포에는 hook + 인터페이스만*, 구현은 private. ESLint `boundaries` 룰로 OSS 빌드 시 enterprise import 차단 [ADR-0013].

### 아키텍처 경계 (ESLint `boundaries`로 강제)

- `packages/core/*` → `packages/enterprise/*` import **금지** ([ADR-0013] A1/A3)
- `packages/host-*/*` → `packages/enterprise/*` import **금지**
- 모든 어노 op → CRDT serializer 통과 후만 영속 ([E16])
- 모든 어노 op → RBAC 게이트 통과 후만 적용 ([E17])

---

## 6. 컴포넌트 작업 패턴

Phase 3 (Vertical Slice "Render a PDF") 시작 시 *컴포넌트 패턴 레퍼런스 feature* 박힘. 본 절은 Phase 3 진입 시 보강.

### 6.1 작업 시작 전 필수 단계 (AI 슬롭 회피)

c3 AGENTS.md 6.1 의 정신을 PDF 도메인으로 substitute:

1. **DESIGN.md 현재 값 재확인 (1~5분)**: 작업하려는 토큰 (color/space/font/radius/cursor/zoom-step) 이 DESIGN.md 에 박혔는지. 변경 없으면 fast skip. 변경/추가 필요 시 DESIGN.md 먼저 갱신 → `pnpm build:tokens` 재실행.
2. **벤치마킹 워크플로** (Phase 3+ 도입): Adobe Acrobat / PSPDFKit / pdf.js 데모 1~2 reference. 스크린샷 분석. UX 디테일 (마우스 커서·로딩 시퀀스·에러 메시지·키보드 단축키) 채집. 우리만의 톤 (잉크 메타포, 자유 캔버스 시각화) 추가. 시간 박스 1d.
3. **외부 reference 라이선스 검증**: 상업 이용 + 수정 자유만. 사용 명시는 plan 또는 commit message에.
4. **태블릿 환경 게이트 (B4)**: 코드 변경이 *입력·렌더링·좌표계* 에 닿으면 Galaxy Tab S9 FE+ 동등 기기 검증 필수. PC 만 통과해도 reject.
5. **자유 캔버스 게이트 (USP-4)**: 페이지 외부 좌표 표현이 *깨질 수 있는* 변경이면 외부 좌표 stroke 저장·복원·undo·redo E2E 테스트 동반.
6. **위변조 호환 (C7)**: 어노 entity 모델·op 형식 변경 시 hash chain 호환성 검증. 변조 시뮬레이션 100% 감지 확인.

---

## 7. AI 에이전트에 대한 메모

이 프로젝트는 1인 개발자가 AI 에이전트에게 작업을 위임하는 방식으로 진행된다. 본 문서(AGENTS.md)는 *도구 중립*이며, 이를 따르는 모든 에이전트(Claude Code, Codex, Cursor, Windsurf 등)에 동등히 적용된다. 에이전트가 다음을 지키지 않으면 위임이 실패한다:

1. **새 세션 시작 시 `claude-progress.md` 먼저 읽기** (Phase 2+ 도입) — 직전 세션 어디까지·차단이 무엇이었는지.
2. **거짓말 금지** — `verifiable.tests`에 명시된 파일이 실제 존재하지 않거나 통과하지 않으면 done 처리하지 않는다. `init.sh`가 이걸 검증.
3. **WIP=1 위반 금지** — 한 번에 하나만. 차단되면 명시적으로 `paused`로 옮기고 이유 기록.
4. **19개 제약 위반 금지** — `applies_constraints`에 명시된 항목은 작업 전 다시 정독. 사유 궁금하면 각 제약 헤딩 옆 `[ADR-XXXX]` 태그를 따라 `docs/adr/`에서 근거 확인.
5. **모르면 멈춰서 물어보기** — 추측해서 진행하지 말 것. 특히 *위변조 (USP-1)*·*협업 (USP-2/3)*·*자유 캔버스 좌표계 (USP-4)*·*영속성 (USP-5)* 영역.
6. **결정은 결정해야 할 시점에** — 거시 결정(스택, 19개 제약, 페이즈 게이트)은 미리 박는다. 미시 결정(키보드 단축키 임계값, 마이크로 인터랙션, 컬러 hover state) 은 해당 feature 작업 시점에 컨텍스트 보고 정한다.
7. **비자명 용어 도입 시 `docs/glossary.md` 확인/추가** — 사용자는 PDF·어노 실무 강함, 일부 이론 용어 학습 중. 새 기술 용어 (CRDT, BVH-tree, OffscreenCanvas, PKCS#11 등) 도입 시 사전에 있는지 확인. 형식: 도메인별 분류 + 각 항목 끝 "**이 프로젝트에서**:" 줄 강제.
8. **시각/UX 결정은 `DESIGN.md` 경유** — colors, typography, spacing, cursor, zoom step, component 패턴, do's & don'ts는 `DESIGN.md` 가 SSOT.
9. **사건 발생 시 `docs/postmortems/<날짜>-<title>.md` 작성** ([ADR-0012]) — Blameless 원칙 (사람 X, 시스템 O), 5 Whys, action items 는 _반드시_ `feature_list.json` 에 새 F-XXX 로 매핑. 사소한 디버깅은 `claude-progress.md` 한두 줄로 충분.
10. **legacy assets 도메인 회고 우선** — `inkvas-legacy-assets/demo1-docs/40_Features/PDF_VIEWER_HISTORY.md` 등 *도메인 회고* 가 재현 필수 UX 식별 1순위. *코드* 는 채택 금지 [A2].
11. **메뉴얼 영향 (`manual_impact`) 처리** — feature 작업 시 `"none"` 외 값이면 `docs/manual/**` 변경 동시 commit. 미동기 시 init.sh fail [D14].

---

## 8. 변경 이력

이 문서는 git log가 변경 이력의 진실의 원천이다. 직접 편집하지 말고 PR로만 수정한다.

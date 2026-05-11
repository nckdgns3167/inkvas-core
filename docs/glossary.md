# Glossary — Inkvas 용어 사전

> 사용자 학습 누적 SSOT. AGENTS.md §7 (8): 비자명 용어 도입 시 본 사전 확인/추가. 형식: 도메인별 분류 + 각 항목 끝 **"이 프로젝트에서:"** 줄 강제.

---

## A. 부트스트랩 / 거버넌스

### SSOT (Single Source of Truth)
- 한 정보의 진실은 *단 하나의* 위치에서만 정의. 같은 정보를 두 군데에 두지 않는 원칙.
- **이 프로젝트에서**: AGENTS.md §0 의 표가 모든 SSOT 의 *위치 SSOT*. 예: 백로그 = `feature_list.json`, 시각 = `DESIGN.md`, 결정 사유 = `docs/adr/`.

### ADR (Architecture Decision Record)
- 비타협 결정을 영구화하는 문서. Status / Context / Decision / Consequences / Alternatives Considered 표준 섹션.
- **이 프로젝트에서**: `docs/adr/XXXX-*.md`. 19 constraints 가 *결과* 라면 ADR 은 *사유*. 새 비타협 결정은 ADR 추가 PR 필수.

### Plan-as-Code
- 실행 계획을 ADR 과 동급 첫 클래스 산출물로 영구화. 명명 규칙 + frontmatter + Pre-mortem + Post-mortem + supersede 체인.
- **이 프로젝트에서**: `docs/plans/NNNN-<topic>.md`. ADR-0002 (c3 ADR-0010 port).

### WIP=1
- *Work in Progress* 한 번에 하나. `feature_list.json` 의 `wip_policy.max_in_progress: 1` 절대값. `wip_lock: false` (의존성 업데이트 등 메타) 는 카운트 제외.
- **이 프로젝트에서**: AGENTS.md §3.1. 솔로 개발자가 "다른 거 해야지" 로 작업 미루는 패턴을 *구조적* 차단.

### Pre-mortem / Post-mortem
- *Pre-mortem*: plan 작성 시점에 "6개월 후 실패했다면 왜" 미리 적기. 보이지 않는 위험 가시화.
- *Post-mortem*: feature done 처리 전 회고 (Blameless, 5 Whys). action items 는 새 F-XXX 로 백로그 통합.
- **이 프로젝트에서**: ADR-0012 페어링. validate-feature-list.ts 가 done 시 plan 의 Post-mortem 섹션 비어있지 않음 강제.

### Open-core / commercial dual
- 코어 기능은 OSS 라이선스 (Inkvas: Apache-2.0), 조직 운영·감사·규제 기능은 commercial 라이선스. 단일 코드베이스 *분리*.
- **이 프로젝트에서**: `inkvas-core` (Apache-2.0) + `inkvas-enterprise` (commercial dual). ADR-0013 경계. 상용 라이선스 키 검증조차 OSS 안에 두지 말 것 (CLA fork 회피).

---

## B. PDF / 어노테이션 / 자유 캔버스

### PDF 어노테이션
- PDF 페이지 위에 그린 stroke·도형·텍스트·sticky note·하이라이트 등 마크업 entity. 원본 PDF 와 *분리* 저장 (PDF 위에 *오버레이*) 또는 *임베드* 저장 (PDF 파일 내부).
- **이 프로젝트에서**: 분리 저장이 기본 (DB 영속, USP-5). 임베드 export 는 별도 기능 (Phase 4+).

### 자유 캔버스 (Infinite Canvas)
- PDF 페이지 *외부* 좌표에도 그릴 수 있는 무한 평면. 페이지 = 고정 transform 인 평면 위 객체.
- **이 프로젝트에서**: USP-4 코어 차별화. ADR-0005 좌표계 (페이지 외부 좌표 허용 설계). Phase 4 자유 캔버스 게이트.

### Stroke
- 펜·형광펜으로 그린 *연속된 점 series*. 시작 → 압력 변화 → 종료. 자료구조: `[x, y, pressure]` array + style.
- **이 프로젝트에서**: USP-1 hash chain 의 *순서 단위*. CRDT op 의 *원자 단위* (USP-3 E16).

### Eraser O(N²) 부채
- 옛 viewer (`pdf_viewer_svelte/src/lib/tools/eraserMode.svelte.ts`) 의 centerline split 알고리즘 — N stroke × M segment 비교가 O(N²M) 폭주.
- **이 프로젝트에서**: ADR-0007 에서 BVH-tree / RBush / Hit-region map 후보 비교 후 재설계. Phase 4 Gate 의 *eraser 10k segment <16ms* 검증.

---

## C. 협업 / 동시성 / 위변조

### CRDT (Conflict-free Replicated Data Type)
- 동시 편집에서 *수렴* 보장하는 자료구조. 모든 op 가 commutative (순서 무관 동일 결과).
- 후보 라이브러리: Yjs (성숙도·바이너리 효율), Automerge (JS 친화·문법 명료).
- **이 프로젝트에서**: USP-3 코어. ADR-0008 결정. *모든 어노 op 가 CRDT op 표현* (E16 호환성).

### Presence
- 다른 사용자의 *현재 위치* (커서 좌표·선택 영역·도구) 를 실시간 시각화. Yjs `awareness` 또는 커스텀 프로토콜.
- **이 프로젝트에서**: USP-2 협업 코어. Phase 5 구현.

### RBAC (Role-Based Access Control)
- 사용자에게 *역할* 부여, 역할별 권한 정의. Inkvas 기본 4종: viewer / commenter / editor / owner.
- **이 프로젝트에서**: USP-2 코어. ADR-0019. Enterprise 측에서 페이지별·도구별·시간 한정 custom role 확장.

### Hash chain (Merkle-like)
- 이전 stroke 의 hash 를 다음 stroke 의 input 에 포함시켜, 어떤 op 든 변조 시 후속 모든 hash 가 깨지는 자료구조. Merkle tree 의 *1차원* 버전.
- **이 프로젝트에서**: USP-1 OSS 측 코어. ADR-0017. CRDT op 와 *동시 통과* — 모든 CRDT op 가 hash chain 의 input.

### PKI (Public Key Infrastructure)
- 디지털 서명·인증서 chain·CRL/OCSP 검증의 표준 시스템. RSA / ECDSA + X.509 인증서.
- **이 프로젝트에서**: USP-1 Enterprise 측 코어. ADR-0017. HSM (PKCS#11/KMIP) 으로 키 보호 (P6-1).

### 블록체인 anchoring
- audit log 의 *root hash* 를 일정 주기로 public/private chain 에 anchor — third-party 시점 증명.
- 후보: Polygon (public, 저비용), Ethereum (public, 신뢰성), private chain (망분리 환경).
- **이 프로젝트에서**: USP-1 Enterprise 강한 차별화. ADR-0017. Phase 6 본격 구현. 망분리 환경은 private chain 기본.

---

## D. 렌더링 / 성능 / 호스트 통합

### OffscreenCanvas
- 메인스레드와 *분리된* canvas. Worker pool 에서 비동기 렌더 가능. 메인스레드 long-task 0 의 핵심 기술.
- **이 프로젝트에서**: ADR-0006. 1000+ stroke 60fps 의 baseline. B5 (long-task 0) 통과 도구.

### Worker pool
- 다수의 Web Worker 를 풀로 관리. 작업 분배 + 우선순위 + 백프레셔.
- **이 프로젝트에서**: ADR-0006. OffscreenCanvas + 어노 렌더링 + hash chain 계산 분산.

### BVH-tree / RBush / Quadtree
- 2D *공간 인덱스* 자료구조. 점·선분·box 의 빠른 충돌 검출.
- **이 프로젝트에서**: ADR-0007 eraser 알고리즘 후보 + ADR-0005 자유 캔버스 hit-test 공유.

### Pointer Events
- 마우스 / 터치 / S Pen 등 *모든 포인터* 입력을 통합한 W3C 표준 이벤트. `pointerType`, `pressure`, `tiltX/Y` 등 속성.
- **이 프로젝트에서**: ADR-0018 태블릿 입력 baseline. S Pen 압력 + 손가락 핀치 + 마우스 동시 지원.

### postMessage 호스트 통합
- iframe 임베드된 콘텐츠와 호스트 페이지 간 양방향 메시지 채널. `window.postMessage()` + `event.origin` 검증.
- **이 프로젝트에서**: ADR-0009. C10 origin 검증 필수. 호스트 임베드 3종 (vanilla HTML / React / Android WebView).

---

## E. 메뉴얼 / Audit / 라이선스 경계

### Manual freshness gate (D14 / ADR-0014)
- 기능 PR 의 `manual_impact` 필드 ≠ `"none"` 인데 `docs/manual/**` 변경 없으면 merge 차단. MDX live import + Playwright screenshot diff.
- **이 프로젝트에서**: "기능은 짰는데 매뉴얼이 6개월 뒤처짐" 사고를 *구조적* 차단.

### Audit freshness (D15)
- `docs/business/competitive-feature-audit.md` 의 `last_updated` 90일 이상 경고, 180일 이상 init.sh fail. `audit_ref` 필드로 feature 와 트레이서블.
- **이 프로젝트에서**: 분기 1회 시장 갱신 강제. 솔로 개발자가 시장 변화 놓치지 않는 구조.

### License-tier (ADR-0013)
- 각 feature 의 `feature_list.json` 항목에 `license_tier: "oss" | "enterprise"` 필드. 경로 정합 검증 (`oss` 는 `packages/core/*`/`host-*/*`, `enterprise` 는 `packages/enterprise/*` 만).
- **이 프로젝트에서**: A1 (Apache-2.0 invariance) + A3 (license-boundary 트레이서블) 의 *기계 검증* 수단.

---

## F. 약어 / 표준

| 약어 | 풀이 |
|---|---|
| WCAG 2.1 AA | Web Content Accessibility Guidelines, 권장 레벨. Lighthouse a11y 95+ 게이트 (D12) |
| ADA | Americans with Disabilities Act — 미국 접근성 법 |
| Section 508 | 미국 연방 정부 IT 접근성 법 (ADR-0010) |
| WA 마크 | 한국 웹접근성 마크 — 한국 B2G 진입에 필수 |
| ISMS-P | 한국 정보보호 인증 — B2G 진입 필수 |
| GS 1등급 | 한국 SW 품질인증 1등급 — B2G 진입 권장 |
| CC | Common Criteria (국제 보안 인증) |
| ATS | Applicant Tracking System (관련 없음 — c3 도메인, Inkvas 미사용) |
| HSM | Hardware Security Module — 서명 키 물리적 보호 (P6-1) |
| PKCS#11 / KMIP | HSM 표준 API |
| MDX | Markdown + JSX — 메뉴얼 live import (ADR-0014) |
| OCR | Optical Character Recognition — Inkvas viewer scope 외 (별도 plan, AI 트랙) |
| CJK | Chinese / Japanese / Korean — 동아시아 문자 (D13) |
| CRL / OCSP | 인증서 무효화 목록 / 실시간 검증 (PKI) |

---

## 변경 이력

| 일자 | 변경 |
|---|---|
| 2026-05-12 | 초안 작성 (Phase 1) — 부트스트랩 + PDF + 협업·위변조 + 렌더링 + 메뉴얼 + 약어 6 도메인 |

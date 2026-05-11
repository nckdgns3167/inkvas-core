# License Boundary — OSS ↔ Enterprise 분류표

> ADR-0013 (Open-core 경계, Phase 2 작성) 의 *input*. Phase 3 코드 시작 *전* 본 경계가 박혀있어야 함 (bootstrap.md §"솔루션화 컨설팅 (2) Open-core 경계 사전 설정").
>
> 원칙: 단일 사용자 가치 = OSS / 조직 운영·감사·규제 = Enterprise.

---

## 0. 결정 상태

- 작성 단계: **Phase 0 드래프트**
- G0 confirm 항목: **(b) 라이선스 경계** 직접 대상
- 본 문서 변경 시 ADR-0013 (Phase 2) 동시 업데이트 필수

---

## 1. 분류 원칙 (4축)

| 축 | OSS (Apache-2.0) | Enterprise (commercial dual) |
|---|---|---|
| **사용자** | 개인·솔로·SMB 무료 사용 | 50인+ / 공공·금융 |
| **가치** | 단일 사용자 *생산성·재미* | 조직 *운영·감사·규제 대응* |
| **데이터** | 로컬 / 단일 사용자 IndexedDB | 다중 사용자 / 감사 로그 / DRM 보호 |
| **확장성** | Plugin contract 의 *consumer* | Plugin contract 의 *provider* (구현 lazy import) |

---

## 2. 기능별 분류표

### 2.1 Viewer Core (OSS)

| 기능 | 분류 | 비고 |
|---|---|---|
| PDF 렌더 (1 페이지 / 다 페이지) | **OSS** | ADR-0004 |
| Zoom / pan / page navigation | **OSS** | |
| 썸네일 사이드바 | **OSS** | |
| 텍스트 추출 + 검색 (find in PDF) | **OSS** | |
| 인쇄 미리보기 | **OSS** | |
| 키보드 단축키 / a11y / WCAG 2.1 AA | **OSS** | (B2G 진입에도 OSS 측에서 충족 필요) |
| CJK 폰트 fallback | **OSS** | ADR-0011 |

### 2.2 Annotation (OSS)

| 기능 | 분류 | 비고 |
|---|---|---|
| 펜 / 형광펜 / 지우개 | **OSS** | ADR-0005 |
| 텍스트 / 도형 (사각·원·직선) | **OSS** | |
| sticky note | **OSS** | |
| 단일 선택 + resize + 회전 | **OSS** | |
| 다중 선택 (Lasso) | **OSS** | |
| Undo / Redo | **OSS** | |
| **자유 캔버스 (페이지 외부 좌표)** | **OSS** | USP-4 코어. OSS 차별화 |
| 워터마크 오버레이 (단순) | **OSS** | |
| 측정 도구 (ruler / area) | **OSS** | |

### 2.3 Persistence (OSS / 부분 Enterprise)

| 기능 | 분류 | 비고 |
|---|---|---|
| IndexedDB + Service Worker | **OSS** | USP-5 코어 |
| 단일 사용자 작업이력 영속 | **OSS** | |
| 오프라인 동작 (단일 사용자) | **OSS** | |
| **서버 sync (단일 사용자 → 자체 호스팅)** | **OSS** | OSS 빌드 단독 서버 sync 가능 (BYO backend) |
| 다중 사용자 작업이력 sync | OSS (CRDT 의 자연스러운 확장) | ADR-0008 |
| Audit log dashboard (시각화·검색·export) | **Enterprise** | 운영·감사 측면 |
| Audit log → SIEM 연동 | **Enterprise** | |

### 2.4 Collaboration / RBAC (OSS / 부분 Enterprise)

| 기능 | 분류 | 비고 |
|---|---|---|
| **CRDT (Yjs/Automerge) 동시 편집** | **OSS** | USP-3 코어. OSS 차별화 |
| WebRTC peer-to-peer 동기 | **OSS** | |
| WebSocket relay (단순 self-host) | **OSS** | |
| Presence (다른 사용자 커서) | **OSS** | |
| **RBAC viewer/commenter/editor/owner (기본 4종)** | **OSS** | USP-2 코어. ADR-0019 |
| Custom role · 권한 세부 분류 (페이지별·도구별) | **Enterprise** | 조직 운영 측면 |
| Group / Team 관리 UI | **Enterprise** | |
| SSO / SAML / LDAP / OAuth (조직 IdP 연동) | **Enterprise** | |

### 2.5 Integrity / 위변조방지 (OSS 부분 / Enterprise 코어)

| 기능 | 분류 | 비고 |
|---|---|---|
| **Hash chain (Merkle-like, 이전 stroke hash 가 다음에 포함)** | **OSS** | USP-1 OSS 측. ADR-0017 |
| **Append-only audit log (로컬·서버 sync)** | **OSS** | USP-1 OSS 측 |
| Hash chain 검증 CLI / UI | **OSS** | |
| **PKI 디지털 서명 (RSA / ECDSA)** | **Enterprise** | USP-1 Enterprise 측 |
| 인증서 검증 (X.509 chain) | **Enterprise** | |
| **HSM 연동 (서명 키 보호)** | **Enterprise** | |
| **블록체인 anchoring (Polygon / Ethereum / private chain)** | **Enterprise** | USP-1 강한 차별화 |
| Certified Redaction (PDF/A 호환) | **Enterprise** | |
| DRM (열람·인쇄·복사 제한) | **Enterprise** | |

### 2.6 Host Integration (OSS)

| 기능 | 분류 | 비고 |
|---|---|---|
| postMessage 계약 + iframe 임베드 | **OSS** | ADR-0009 |
| `window.pdfv` JS API | **OSS** | |
| Android JS bridge / iOS WKMessageHandler | **OSS** | |
| 호스트 데모 3종 (vanilla / React / Android) | **OSS** | |

### 2.7 Deployment / Build (OSS / 부분 Enterprise)

| 기능 | 분류 | 비고 |
|---|---|---|
| `pnpm build:oss` 단독 100% 동작 | **OSS** | ADR-0013 핵심 게이트 |
| Docker / Compose 단순 self-host | **OSS** | |
| `pnpm build:enterprise` + plugin lazy load | **Enterprise** | |
| **Air-gap 빌드 (망분리 환경)** | **Enterprise** | B2G 필수. Phase 7 |
| **상용 라이선스 키 검증** | **Enterprise only** | bootstrap.md "라이선스 키 검증조차 OSS 안에 두지 말 것" (CLA fork 회피) |

---

## 3. 경계 단속 메커니즘 (Phase 1 박힘)

- **ESLint boundaries 룰** — `packages/core` 가 `packages/enterprise/*` 를 import 하면 빌드 실패.
- **Plugin contract** — `packages/core` 는 `Plugin<T>` interface 만 노출, *구현 0*. Enterprise 측에서 `register(plugin)` 호출.
- **Capability registry** — OSS 빌드 시 `enterprise` capability 가 null. 코드 곳곳의 `if (capabilities.enterprise.sso)` 가 자연스럽게 *no-op*.
- **CI check** — `pnpm build:oss` 단독 빌드 + 단독 E2E 가 *항상 통과*. PR 마다 검증.

---

## 4. 변경 이력

| 일자 | 변경 | 트리거 |
|---|---|---|
| 2026-05-12 | 초안 작성 (4축 원칙 + 7 그룹 분류표) | bootstrap.md Phase 0 산출물 |

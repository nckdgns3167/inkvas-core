# Inkvas

> **Ink + (can)vas** — 잉크가 닿는 캔버스.
> PDF 어노테이션 · 자유 캔버스 · 협업 · 위변조방지 · 영속성 *4축 결합* 솔루션.

> ⚠️ **Phase 0 / bootstrap 단계.** 본 README 는 *최소 placeholder* 이며, 사업·기술 결정 진척에 따라 갱신됩니다.

---

## 정체성

ADR-0000 ("프로젝트 정체성") 의 사용자 원문이 *불변 헌법*. 본 README 는 그 *압축 노출* 일 뿐 — 풀 문서는 [`docs/adr/0000-project-identity-inkvas.md`](docs/adr/0000-project-identity-inkvas.md).

- **이름**: `Inkvas` — Ink (잉크) + (can)vas (캔버스). 의미가 정확히 컨셉이랑 매칭, 컨셉 응축력 가장 높음.
- **음역 (한국)**: 잉크바스.
- **도메인 우선순위**: `.app` > `.io` > `.so` > `.com`.

---

## 사업 가설 (Live)

- 4축 결합 = **위변조방지 (Integrity) · 협업 (Collaboration) · 동시작업 (Real-time CRDT) · 자유 캔버스 (Infinite Canvas) · 작업이력 영속성 (Persistence)** — 시장에 *현존하지 않는* 조합.
- **Open-core (Apache-2.0)** + **Enterprise (commercial dual)** 분리. OSS 코어는 영원히 OSS, Enterprise 는 SSO·SAML·DRM·HSM·블록체인 anchoring·redaction-certified·air-gap 빌드.
- 타깃 4사분면: B2B / B2G × 대기업 / SMB·공공.
- 진입 전략: Phase 0~4 (코어 viewer + 어노) → Phase 5 (협업·오프라인) → Phase 6 (Enterprise plugin) → Phase 7 (B2B/B2G 솔루션화).

풀 문서: [`docs/business-direction.md`](docs/business-direction.md).

---

## 핵심 차별 (USP 5종)

| # | USP | OSS / Enterprise | 차별화 정도 |
|---|---|---|---|
| 1 | 위변조방지 (hash chain + audit log / PKI + 블록체인 anchoring) | OSS + Enterprise | **강한 차별화** |
| 2 | 협업 (RBAC + presence + 코멘트) | OSS + Enterprise | 모방 + OSS 차별화 |
| 3 | 동시작업 (CRDT, Yjs/Automerge — ADR-0008) | OSS | 모방 + OSS 차별화 |
| 4 | 자유 캔버스 드로잉 (페이지 외부 좌표) | OSS | **강한 차별화** |
| 5 | 작업이력 영속성 (IndexedDB + SW + 서버 sync, 작업 손실 0) | OSS | 차별화 |

상세: [`docs/business/usp.md`](docs/business/usp.md), [`docs/business/competitive-feature-audit.md`](docs/business/competitive-feature-audit.md).

---

## 환경 제약 (불변)

- PC 브라우저 + **태블릿** (Galaxy Tab S9 FE+ 동등) 60fps 깨끗.
- 손가락 핀치 + 2손가락 pan + S Pen 동시.
- 모든 Phase Gate 에서 *태블릿 회귀 0* (ADR-0018).

---

## 진행 상태

- Phase 0 — Identity & Business Hypothesis (현재) ✓ ADR-0000 + 5 business docs + G0 confirm.
- Phase 1 — Harness Skeleton (c3 5 파일 이식 + PDF 어휘 substitute).
- Phase 2 — Technical ADR Burst (ADR-0001~0019).
- Phase 3 — Vertical Slice "Render a PDF".
- Phase 4 — Annotation MVP.
- Phase 5 — Host integration + Collaboration (USP-2/3) + Offline.
- Phase 6 — Enterprise plugin + 위변조방지 (USP-1).
- Phase 7 — Solutionization (B2B/B2G 진입).

상세 plan: [`docs/plans/0001-bootstrap-from-zero.md`](docs/plans/0001-bootstrap-from-zero.md).

---

## 라이선스

- **Core**: Apache License 2.0 — `LICENSE`.
- **Enterprise**: commercial dual — 별도 레포 `inkvas-enterprise` (private).
- 경계: [`docs/business/license-boundary.md`](docs/business/license-boundary.md).

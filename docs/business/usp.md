# USP 5종 — 핵심 차별 (Live)

> Inkvas 의 *5가지 USP* SSOT. **Live 문서, 분기 갱신 필수** (`docs/business/competitive-feature-audit.md` 와 동기).
>
> bootstrap.md §"사용자 결정 (확정)" → "핵심 차별 기능 (USP)" 의 5종을 *경쟁사 audit 와 대칭* 정의. 각 USP 마다 — 정의 / 후보 기술 / 경쟁사 격차 / Phase 매핑 / 측정 지표.
>
> 본 문서는 ADR-0005 (어노테이션 + 자유 캔버스), ADR-0008 (Persistence + CRDT), ADR-0017 (위변조방지), ADR-0018 (태블릿 입력·성능), ADR-0019 (RBAC) 의 *기능 input*.

---

## 0. 결정 상태

- 작성 단계: **Phase 0 드래프트**
- G0 confirm 항목: **(e) USP 5종 정의·후보 기술·측정 지표** 직접 대상
- 본 문서 변경 시 위 5 ADR (Phase 2 작성) 동시 input 갱신

---

## USP-1: 위변조방지 (Integrity)

### 정의
PDF 어노테이션·문서 변조를 *암호학적으로* 차단. 변조 시도 발생 시 *검증 단계에서 즉시 감지*. B2G·금융·법무 필수.

### 후보 기술
| Layer | 기술 후보 | 책임 |
|---|---|---|
| **Hash chain (OSS)** | Merkle-like: 이전 stroke hash 가 다음 stroke 의 input | 어노테이션 *순서* + *내용* 무결성 |
| **Append-only audit log (OSS)** | 로컬 + 서버 sync. 모든 op (create/update/delete) 가 append-only | *행위 이력* 무결성 |
| **PKI 디지털 서명 (Enterprise)** | RSA / ECDSA (X.509 chain) | *발신자 신원* + *문서 무결성* 보증 |
| **HSM 연동 (Enterprise)** | PKCS#11 / KMIP | 서명 키 *물리적 보호* |
| **블록체인 anchoring (Enterprise)** | Polygon (public, 저비용) / Ethereum (public, 신뢰성) / private chain (망분리) | audit chain root 의 *third-party 시점 증명* |

### 경쟁사 격차
| 경쟁사 | 위변조 수준 |
|---|---|
| PDFaid / PDF24 / iLovePDF | ✕ (어노테이션 후 단순 PDF 출력, 변조 검증 없음) |
| Adobe Online | △ (PKI 서명만, hash chain 없음) |
| PSPDFKit / Foxit / Apryse | △ (PKI 서명 지원, hash chain·블록체인 없음) |
| **Inkvas** | **◯ (OSS: hash chain + audit log / Enterprise: + PKI + 블록체인 anchoring)** |

→ **차별화 정도: 강한 차별화** (hash chain + 블록체인 anchoring 조합은 시장 부재).

### Phase 매핑
- Phase 2 (ADR-0017) — 아키텍처 결정
- Phase 4 — viewer/어노테이션 entity 모델이 *hash chain* 호환되도록 baseline
- Phase 5 (CRDT) — *모든 CRDT op 가 hash chain 의 input* 으로 들어가도록 코어 동시 설계 (후속 추가 X)
- Phase 6 (Enterprise) — PKI + 블록체인 anchoring 본격 구현

### 측정 지표
| 지표 | 목표 |
|---|---|
| Hash chain 검증 시간 (1000 stroke) | < 50ms (UI 차단 없음) |
| 변조 시도 감지율 | 100% (단순 변조 시뮬레이션 100건) |
| Audit log append 지연 | < 5ms / op |
| 블록체인 anchoring 빈도 | 5분/회 (Enterprise 기본) |
| 인증서 chain 검증 정확도 | 100% (CRL/OCSP 갱신 기준) |

---

## USP-2: 협업 (Collaboration)

### 정의
멀티 사용자가 *권한·역할 분리* 된 상태로 같은 PDF 를 어노테이션. 사용자별 색·표시, 코멘트 스레드, mention.

### 후보 기술
| Layer | 기술 후보 |
|---|---|
| **RBAC (OSS 기본 4종)** | viewer / commenter / editor / owner |
| **RBAC (Enterprise custom)** | 페이지별·도구별·시간 한정 권한 |
| **사용자별 색·avatar** | 자체 picker + 충돌 회피 알고리즘 |
| **코멘트 스레드** | 어노 anchor + thread reply |
| **mention** | `@user` 파싱 + 알림 (이메일·웹훅) |

### 경쟁사 격차
| 경쟁사 | 협업 수준 |
|---|---|
| 무료 온라인 도구 | ✕ (단일 사용자 only) |
| Adobe Online | ◯ (협업 가능, 유료) |
| PSPDFKit / Foxit / Apryse | ◯ (SDK 단가 부담) |
| **Inkvas** | **◯ (OSS: RBAC 4종 + presence / Enterprise: custom role + IdP)** |

→ **차별화 정도: 모방 + OSS 가격 차별화** (Adobe·PSPDFKit 대비 *OSS 코어* 가 결정적).

### Phase 매핑
- Phase 2 (ADR-0019) — RBAC 모델 결정
- Phase 5 — 협업 + RBAC 코어 구현
- Phase 6 — Enterprise custom role + IdP

### 측정 지표
| 지표 | 목표 |
|---|---|
| 50 사용자 동시 접속 부하 | 서버 CPU < 50% (1 vCPU 기준) |
| RBAC 권한 차단 정확도 | 100% (E2E 테스트) |
| 코멘트 스레드 응답 지연 | < 200ms (presence 와 동일 채널) |
| mention 알림 도달율 | > 99% (이메일 fallback 포함) |

---

## USP-3: 동시작업 (Real-time Concurrent Editing)

### 정의
*CRDT* 기반 충돌 없는 동시 편집. 둘 이상의 사용자가 *동시에* 같은 어노테이션을 수정해도 0 충돌.

### 후보 기술
| Layer | 기술 후보 |
|---|---|
| **CRDT 라이브러리** | Yjs (성숙도·생태계·바이너리 효율) vs Automerge (JS 친화·문법 명료) — ADR-0008 결정 |
| **전송 채널** | WebRTC peer-to-peer (low-latency, 직접 연결) + WebSocket relay fallback (NAT 우회) |
| **Presence** | awareness protocol (Yjs `awareness`) / 커스텀 (Automerge) |
| **충돌 해소** | CRDT 의 자연 의미 (op 가 commutative) |

### 경쟁사 격차
| 경쟁사 | 동시 편집 수준 |
|---|---|
| 무료 온라인 도구 | ✕ |
| Adobe Online | ◯ (Acrobat Sign 등 상위 플랜) |
| PSPDFKit / Foxit / Apryse | ◯ (SDK API 제공, 구현은 통합사 책임) |
| **Inkvas** | **◯ (OSS: CRDT 코어 + WebRTC/WS 모두 제공)** |

→ **차별화 정도: 모방 + OSS 차별화**

### Phase 매핑
- Phase 2 (ADR-0008) — CRDT 라이브러리 + 전송 채널 결정 (ADR-0017 hash chain 과 *양립 검증 필수*)
- Phase 5 — 코어 구현 + presence + 충돌 시나리오 E2E

### 측정 지표
| 지표 | 목표 |
|---|---|
| 2 클라이언트 동시 100 stroke | 0 충돌 (E2E) |
| presence 갱신 지연 (LAN) | < 50ms |
| presence 갱신 지연 (Internet, 동일 region) | < 200ms |
| CRDT 직렬화 크기 (1000 stroke) | < 100KB (네트워크 부담 한계) |
| 오프라인 30분 → 재접속 후 sync | 0 손실, < 5s 합류 |

---

## USP-4: 자유 캔버스 드로잉 (Infinite Canvas)

### 정의
PDF 페이지 *위* 뿐 아니라 페이지 *외부* 공간에도 그리기. 페이지 = 무한 캔버스 위 *고정 객체*. pan 으로 페이지 너머 작업 영역 탐색.

### 후보 기술
| Layer | 기술 후보 |
|---|---|
| **좌표계** | 가상 무한 평면 (float64) — page bbox 는 *고정 transform* 으로 표시 |
| **렌더링** | Canvas / SVG / WebGL — ADR-0005 + ADR-0006 결정 |
| **Worker offload** | OffscreenCanvas + Worker pool (ADR-0006) |
| **자료구조** | spatial index — BVH-tree / RBush / Quadtree (ADR-0007 의 eraser 와 공유) |

### 경쟁사 격차
| 경쟁사 | 자유 캔버스 수준 |
|---|---|
| 무료 온라인 도구 | ✕ (페이지 안에 갇힘) |
| Adobe Online | ✕ |
| PSPDFKit / Foxit | ✕ |
| **Apryse** | △ (whiteboard 모드 별도, PDF 와 통합 약함) |
| **Inkvas** | **◯ (USP-4 코어, OSS)** |

→ **차별화 정도: 강한 차별화** (PDF + infinite canvas 의 통합 제품은 시장 부재).

### Phase 매핑
- Phase 2 (ADR-0005) — 좌표계 + 렌더링 엔진 결정 (페이지 외부 좌표 허용 설계)
- Phase 4 — 코어 구현 + 자유캔버스 게이트 (Phase 4 Gate 의 *자유 캔버스 게이트* 군)

### 측정 지표
| 지표 | 목표 |
|---|---|
| 페이지 외부 좌표에 그린 stroke 의 저장·복원·undo·redo | 100% 정상 (E2E) |
| 자유캔버스 영역 pan 60fps (1000 stroke 누적) | PC + 태블릿 양쪽 |
| 페이지 회전 시 외부 좌표 변환 회귀 | 0 |
| 무한 zoom (0.01x ~ 100x) 시 좌표 정확도 | float64 정밀도 유지 |

---

## USP-5: 작업이력 영속성 (Persistence)

### 정의
메모리 only 폐기 → DB + IndexedDB + 서버 sync. 모든 stroke 가 *영구 기록* (감사 추적 가능). undo/redo 가 세션 한계 없음. 사용자 작업 손실 0.

### 후보 기술
| Layer | 기술 후보 |
|---|---|
| **로컬 저장소** | IndexedDB (브라우저) + Service Worker (오프라인) |
| **서버 동기** | WebSocket relay (CRDT 와 공유) + REST snapshot |
| **DB 백엔드 (BYO)** | PostgreSQL / SQLite (단순 self-host) / Redis (캐시) — OSS 코어는 *backend-agnostic* |
| **append-only audit log** | USP-1 hash chain 과 공유 |
| **undo/redo 모델** | command pattern + append-only history (세션 한계 없음) |

### 경쟁사 격차
| 경쟁사 | 영속성 수준 |
|---|---|
| 무료 온라인 도구 | ✕ (메모리 only) |
| Adobe Online | △ (서버 sync, 오프라인 약함) |
| PSPDFKit / Foxit | △ (구현은 통합사 책임) |
| **Inkvas** | **◯ (USP-5 코어, OSS — 메모리 only 폐기, IndexedDB + Service Worker + 서버 sync)** |

→ **차별화 정도: 차별화** (오프라인 100% + 작업 손실 0 + 세션 한계 없는 undo 의 조합).

### Phase 매핑
- Phase 2 (ADR-0008) — Persistence 아키텍처 결정 (CRDT + audit log 와 통합)
- Phase 4 — 단일 사용자 영속성 baseline (PC + 태블릿)
- Phase 5 — 다중 사용자 + 오프라인 시나리오

### 측정 지표
| 지표 | 목표 |
|---|---|
| 오프라인 30분 사용 후 재접속 동기 | 0 손실 |
| 1만 stroke 작업 후 새로고침 → 복원 | 100% 정상 + < 2s |
| undo 세션 한계 | 무한 (디스크 한계까지) |
| IndexedDB write 지연 (per stroke) | < 5ms (UI 차단 없음) |
| 서버 sync 실패 시 자동 retry | exponential backoff (1s → 32s, 충돌 없음) |

---

## 6. USP 통합 의존성 (양립 검증)

> bootstrap.md §"중요 순서 함정" 인용 — 단독 ADR 결정이 아닌 *교차 검증* 이 필수.

```
USP-3 (CRDT)
    ↓ 모든 op 가 hash chain 의 input
USP-1 (Integrity)
    ↓ 모든 op append-only 저장
USP-5 (Persistence)
    ↓ 다중 사용자 op 의 권한 게이트
USP-2 (RBAC)

USP-4 (Infinite Canvas) ─ 좌표계는 위 4 USP 와 *독립적*. 단, *모든 op 가 페이지 외부 좌표를 표현 가능* 해야 함 (USP-3/5 의 직렬화 호환).
```

---

## 7. 변경 이력

| 일자 | 변경 | 트리거 |
|---|---|---|
| 2026-05-12 | 초안 작성 (5 USP × 5 섹션: 정의·후보 기술·경쟁사 격차·Phase 매핑·측정 지표) | bootstrap.md Phase 0 산출물 |

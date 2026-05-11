# Inkvas 사업 방향성 (Business Direction)

> Inkvas 의 _사업·비전·시장·로드맵·비즈니스 모델·핵심 약속_ SSOT. 기술 결정은 ADR / `feature_list.json`, 시각·UX 는 `DESIGN.md`, 본 문서는 _Why we're building Inkvas_ + _Who we're selling to_ + _What we promise_.
>
> **Live 문서** — 시장 변화·베타 피드백·결정에 따라 갱신. 변경 이력 섹션 박힘. 분기 1회 audit (`docs/business/competitive-feature-audit.md` 와 동기 갱신).

---

## 0. 결정 상태 (Gate G0 추적)

| 항목 | 상태 | 비고 |
|---|---|---|
| (a) 비즈니스 가설 | **DRAFT — G0 confirm 필요** | 본 문서 §1~§4 |
| (b) 라이선스 경계 | **DRAFT — G0 confirm 필요** | `docs/business/license-boundary.md` |
| (c) 가격대 초안 | **DRAFT — G0 confirm 필요** | 본 문서 §6 |
| (d) competitive feature audit + 도입 후보 우선순위 | **DRAFT — G0 confirm 필요** | `docs/business/competitive-feature-audit.md` |
| (e) USP 5종 정의·후보 기술·측정 지표 | **DRAFT — G0 confirm 필요** | `docs/business/usp.md` |

Gate G0 미통과 시 Phase 1 진입 금지 (`docs/plans/0001-bootstrap-from-zero.md` §Phase 0).

---

## 1. 비전

### 슬로건 (드래프트 — G0 confirm 필요)

> **"Where ink meets canvas."**
> 잉크가 닿는 자리, 페이지 너머의 캔버스. (한국어 카피 후보: "잉크가 닿는 캔버스." / "당신의 작업이 영구히 남는 자리.")

Inkvas = **Ink** + **(can)vas** — ADR-0000 헌법.

### 핵심 메시지 (드래프트)

- **"PDF 페이지 위·바깥 어디든 잉크가 닿는 자리, 변조 없이 영구히 남는다."**
- 개인 = *자유 캔버스 드로잉* + *작업이력 영속성* + *오프라인 100% 동작*
- 팀 = *실시간 동시작업* + *권한·역할* + *코멘트·mention*
- 기업·공공 = *위변조방지 (서명·hash chain·audit trail)* + *망분리·air-gap* + *DRM/SSO/감사*

### 카테고리 자기제한 금지 (ADR-0000 헌법 인용)

마케팅 텍스트에서 *"PDF annotation tool"* 단독 사용 금지. *annotation · collaboration · infinite canvas · integrity* 4축을 항상 함께 노출.

---

## 2. 시장 분석 (드래프트 — 수치 검증 필요)

### PDF 어노테이션·전자결재 시장 (한국 기준 추정)

| 지표 | 값 (드래프트) | 검증 액션 |
|---|---|---|
| 글로벌 PDF SDK 시장 규모 | 약 $1.0B (2024 추정) → CAGR ~6% | Gartner / MarketsandMarkets 확인 필요 |
| 한국 전자결재·전자문서 시장 | 연 ~3000억 ↑ (공공 + 민간) | KOSDA / 한국전자문서산업협회 확인 필요 |
| B2G (공공·교육) PDF 뷰어 요구사항 | 망분리·접근성 (WA)·ISMS-P | 조달청 나라장터 RFP 표본 분석 |
| 경쟁 SDK 가격 | PSPDFKit/Nutrient $10k~$100k+/year, Foxit $7k~, Apryse $10k~ | 각 사 영업 자료 |
| OSS 대안 | Mozilla pdf.js (뷰어만, 어노 X), pdf.js-express (freemium) | github.com/mozilla/pdf.js 검토 |

> ⚠️ 수치는 **드래프트** — Phase 0 사용자 confirm 단계에서 *공식 출처* (한국 통계청·KOSIS·KOSDA·Gartner) 로 보강 필요. 솔로 개발자 단독 시장조사 한계 명시.

### 시장 갈증 (스테이크홀더 3종)

**개인 / 솔로 사용자**:
- Adobe Acrobat *유료 구독* 의존, 무료 도구는 *광고·기능 제한*
- 오프라인 100% 동작 + 작업이력 영속 도구 *희소*
- 태블릿 (S Pen) 사용성이 *데스크톱급* 인 도구 거의 없음

**팀·기업 (B2B)**:
- 협업 시 *각자 PDF 받아서 손주석 → 다시 합치기* 의 비효율
- PSPDFKit/Nutrient 등 *SDK 단가 부담* (스타트업·중견 진입 장벽)
- *위변조 감사 추적* 가능한 어노테이션 도구 부재 (계약·내부 검토 시 핵심)

**공공·금융 (B2G·B2F)**:
- 망분리·air-gap 환경에서 동작하는 *상용 grade 어노테이션* 거의 없음
- 위변조방지 (서명·hash chain·블록체인 anchoring) *조달 RFP* 출현 증가
- 접근성 인증 (WA) + 보안 인증 (ISMS-P / GS 1등급) 필수

### Inkvas 기회 (드래프트 가설)

> 가설 H1: *Open-core (Apache-2.0) viewer + 위변조방지 + 무한 캔버스 + 협업/동시작업* 의 **4축 결합** 은 글로벌·국내 어디에도 *현존하지 않는다*. 단일 USP 보다 *교차 결합* 이 진입 장벽.

> 가설 H2: 솔로 개발자가 B2B/B2G 진입할 때 *대형 SDK 대비 가격 1/5~1/10* + *오픈코어 신뢰성* 로 SMB·공공 SaaS 도입 빈틈 공략 가능.

> 가설 H3: *기존 SmartOn·가스피아 (한국가스안전공사) 도입 경험* 을 reference 로 활용해 진입 마찰 감소 (→ `docs/business/reference-tracker.md`).

---

## 3. 타깃 4사분면 (B2B/B2G × 대기업/SMB·공공)

| | **B2B (민간)** | **B2G (공공)** |
|---|---|---|
| **대기업·중견** | 사내 문서검토·계약·QA 협업. SSO/SAML/DRM 필수. 도입 비용 민감도 낮음. 1차 진입은 *영업 사이클 6~12개월* | 공공기관·금융·국방 — 망분리·ISMS-P/GS 1등급 필수. 도입 사이클 12~24개월. 솔로 단독 진입 어려움, *파트너 (SI 업체)* 의존 |
| **SMB·소규모** | 스타트업·중견 — Open-core + low-tier 유료 (월 $20~$100/seat) 진입. 1차 진입은 *PLG (product-led growth)* | 중소 공공기관·교육·지자체 — 행정안전부 표준 인증 + 학교/지방 RFP. *솔루션 패키지 + SI 파트너* 결합 |

### Phase 별 진입 전략 (드래프트)

- **Phase 0~4**: 코어 viewer + 어노테이션 + 자유 캔버스 + 위변조 baseline → OSS 공개 (PLG seed).
- **Phase 5**: 협업·동시작업·오프라인 → 개인·SMB 무료 + Pro/Team 유료 정의.
- **Phase 6**: Enterprise plugin (SSO·SAML·HSM·블록체인 anchoring·redaction-certified) → B2B 대기업 진입.
- **Phase 7**: 보안 인증 (ISMS-P/GS) + 망분리 빌드 → B2G 진입.

---

## 4. JTBD (Jobs To Be Done) — 드래프트

| 사용자 | Job (When ... I want to ... so I can ...) |
|---|---|
| 솔로 디자이너·기획자 | *태블릿으로 PDF 시안 검토할 때*, 잉크 흐르듯 자연스럽게 어노테이션 + 외부 캔버스에 메모하고 싶다, *작업 손실 없이* 영구 보존하기 위해. |
| 팀 리뷰어 (개발·기획·법무) | *계약·요구사항 PDF 를 둘 이상이 동시에 검토할 때*, 실시간 cursor + 권한 분리된 어노테이션을 원한다, *합치는 노가다 0* 으로 결재까지 가기 위해. |
| 기업 감사·법무 | *내부 검토 PDF 어노테이션이 변조 없이 남아야 할 때*, 서명·hash chain·audit log 가 검증되는 도구를 원한다, *컴플라이언스·소송 대응* 을 위해. |
| 공공 발주처 | *망분리 환경 PDF 검토 도구 발주* 시, OSS 코어 + air-gap 빌드 + 접근성·보안 인증 갖춘 솔루션을 원한다, *조달·납품·운영* 일관성 확보. |

---

## 5. 비즈니스 모델 — Open-core + Enterprise dual

`docs/business/license-boundary.md` 와 본 §6 가격대가 SSOT. 본 섹션은 *원칙* 만 박음.

### 원칙 (ADR-0000 헌법 정합)

- 단일 사용자 가치 = OSS (Apache-2.0) — viewer / 어노테이션 / 자유 캔버스 / 오프라인 / 작업이력 영속.
- 조직 운영·감사·규제 = Enterprise (commercial dual) — SSO/SAML, audit dashboard, redaction-certified, DRM, HSM, 블록체인 anchoring, air-gap 빌드.
- 상용 라이선스 키 검증조차 OSS 안에 두지 말 것 (CLA fork 회피).

---

## 6. 가격 정책 초안 (드래프트 — G0 confirm 필요)

> ⚠️ 본 절은 **드래프트**. Phase 5 (협업) Gate 통과 후 *유료화 활성*, Phase 6 (Enterprise) 진입 시 실가격 확정.

### 3 플랜 후보 (드래프트)

| 항목 | **Free (OSS)** | **Pro** | **Team** | **Enterprise** |
|---|---|---|---|---|
| 대상 | 개인 / 솔로 | 프리랜서·SMB 1~5인 | 5~50인 팀 | 50인+ / 공공·금융 |
| 가격 (드래프트) | $0 | **$8~$12/seat/mo** | **$15~$25/seat/mo** | 견적 (시작 $20k/yr~) |
| 어노테이션·캔버스 | 풀 | 풀 | 풀 | 풀 |
| 오프라인 + 영속성 | ◯ | ◯ | ◯ | ◯ |
| 실시간 동시작업 (USP-3) | △ (P2P, 2인) | ◯ (5인) | ◯ (50인) | ◯ (무제한) |
| RBAC (USP-2) | viewer/editor 2종 | + commenter | + owner / 권한 세부 | + custom roles |
| 위변조 (USP-1) — hash chain + audit log | ◯ | ◯ | ◯ | ◯ |
| 위변조 — PKI 서명 + 블록체인 anchoring | ✕ | ✕ | ✕ | ◯ |
| SSO / SAML / LDAP | ✕ | ✕ | ✕ | ◯ |
| DRM / HSM | ✕ | ✕ | ✕ | ◯ |
| Air-gap 빌드 | ✕ | ✕ | ✕ | ◯ |
| 지원 SLA | community | email (72h) | email + chat (24h) | 견적 (24/7 등급별) |
| 만원 단위 (KRW) | 무료 | 월 1.2만~1.6만 | 월 2~3만 | 연 2700만~ |

### 가격 결정 룰 (드래프트)

- Pro/Team 의 USD 가격은 *경쟁사 평균의 0.5~0.7배* (PSPDFKit/Nutrient $10k/yr+ vs 우리 SMB Team 50인 × $20 × 12 = $12k/yr, 즉 *가시적 절감*).
- Enterprise 시작가 $20k/yr 는 *대형 SDK 의 1/5~1/3* 수준 — *오픈코어 신뢰성 + 솔로 운영 마진* 의 균형점.
- 한국 공공 (망분리·인증 필수) 은 별도 *솔루션 패키지* 견적 (Phase 7 견적 템플릿 별도).

---

## 7. 핵심 약속 (Promises)

1. **OSS 코어는 영원히 OSS** — Apache-2.0 라이선스 supersede 금지 (변경 시 ADR + 사용자 confirm).
2. **태블릿 60fps 회귀 0** — 모든 Phase Gate 에 박힘 (ADR-0018).
3. **작업 손실 0** — 메모리 only 폐기, IndexedDB + 서버 sync (ADR-0008, USP-5).
4. **위변조 감사 가능** — hash chain + append-only audit log 가 OSS 코어. 변조 시도는 즉시 검증 실패 (USP-1).
5. **메뉴얼 자동 최신화** — 기능 추가 PR 에 메뉴얼 변경 없으면 merge 차단 (ADR-0014).

---

## 8. 변경 이력

| 일자 | 변경 | 트리거 |
|---|---|---|
| 2026-05-12 | 초안 작성 (Phase 0) | bootstrap.md → ADR-0000 |

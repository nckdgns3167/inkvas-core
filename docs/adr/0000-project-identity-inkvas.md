# ADR-0000: 프로젝트 정체성 — Inkvas

- Status: Accepted (2026-05-12)
- Constraints affected: 전 Phase (브랜드 정체성 헌법)
- Related ADRs: (선행 ADR 없음 — 본 ADR 이 Inkvas 의 *0번* 결정)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` ("프로젝트명 — Inkvas (확정)" 섹션)

> **본 ADR 은 `docs/plans/0001-bootstrap-from-zero.md` 의 "프로젝트명 — Inkvas (확정)" 섹션 원문을 *그대로 인용* 한다. 요약·재해석 금지.** 사용자가 직접 작성한 결정 사유이고, *왜 이 이름이 옳은지* 가 솔루션의 *브랜드 정체성 헌법* 이 된다. 후속 마케팅·로고·UX 톤 결정 모두 본 사유를 입력으로 사용한다.

---

## Context (사용자 원문 — verbatim)

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

---

## Decision

| 항목 | 결정 |
|---|---|
| **프로젝트명** | `Inkvas` (확정) |
| **도메인 우선순위** | `.app` > `.io` > `.so` > `.com` (가용성에 따라 선택, 4종 모두 미확보 시 사용자 confirm 받아 변형/대안 결정) |
| **OSS 레포** | `inkvas-core` (Apache-2.0) |
| **Enterprise 레포** | `inkvas-enterprise` (commercial dual) |
| **브랜드 음역 (한국)** | "잉크바스" |
| **GitHub Org 후보** | `inkvas` (1순위) / 충돌 시 `inkvas-app`, `inkvas-io` 순으로 후보 |
| **npm 스코프** | `@inkvas/*` (Phase 1 부터 패키지 게시) |

## Alternatives Considered

본 ADR 은 사용자의 *사전 확정* 결과를 박는 것이라 대안 비교는 사용자 결정 사유 ((1)~(5)) 자체가 대안 비교의 결론이다. 후속 supersede 시 본 ADR 의 (1)~(5) 기준을 *전부 충족하는 새 후보* 가 제시되어야 한다 (특히 (2) 의미 응축력 / (5) 글로벌 SaaS 작명 관행 부합).

## Consequences

### 불변 입력으로 박힘
- 후속 마케팅·로고·UX 톤 결정 모두 본 (1)~(5) 사유가 *불변 입력*. 변경 시 본 ADR supersede 필수.
- 로고 디자인 원칙: 잉크의 *유동성* + 캔버스의 *경계* 둘을 시각적으로 동시에 비추는 마크. (Figma 의 컬러 원형, Notion 의 단순 글꼴 같은 *소박하지만 의미가 비치는* 마크 선호.)
- 카피톤: 직설적이지 않고 *살짝 시적*. "PDF 뷰어" 카테고리 라벨 회피, "당신의 잉크가 닿는 캔버스" / "Where ink meets canvas" 등 컨셉 비유 우선.
- 카테고리 자기제한 금지: 마케팅 텍스트에서 *"PDF annotation tool"* 단독 사용 금지. *annotation · collaboration · infinite canvas · integrity* 4축을 항상 함께 노출.

### 가용성 검증 (수행 결과 — 2026-05-12)

Phase 0 자율 진행 단계에서 4종 가용성 1차 검증 *완료* (사용자 G0 confirm 으로 외부 호출 승인 후).

**검증 결과 요약**

| # | 대상 | 결과 | 신뢰도 |
|---|---|---|---|
| ① | 도메인 `inkvas.{app,io,so,com}` 4종 | **모두 미등록 추정 (강)** | DNS NXDOMAIN (4/4) |
| ② | npm `inkvas` (unscoped) | **가용** | registry 404 |
| ② | npm `@inkvas/*` (scope) | **가용** | search 0 results |
| ③ | GitHub `inkvas` org | **가용** | API 404 + search 0 matches |
| ④ | KIPRIS 상표 `Inkvas` / `잉크바스` | **1차 일치 없음 (잠정)** | 웹검색 도구 결과 — 정밀 확정은 KIPRIS 직접 방문 권장 |

#### ① 도메인 whois (`inkvas.{app,io,so,com}`)
- 상태: **모두 미등록 추정 (강)** — `Resolve-DnsName` (PowerShell) 결과 4종 모두 `DNS name does not exist` (NXDOMAIN). 등록된 도메인이 DNS 미배치인 경우는 *드물고*, NS 레코드 자체 부재는 *미등록 강한 증거*.
- 우선순위 적용: `inkvas.app` (1순위, 권장 등록).
- 의사결정 룰: B2B/B2G 진입 전 *방어용* 으로 1순위 + 2~3순위 (`inkvas.io`, `inkvas.so`) 도 사전 확보 권장. 본 ADR 의 *후속 작업 트래커* 로 박힘 (실 등록은 사용자가 등록 대행사에서 별도 수행).
- 한계: whois CLI 미설치 + rdap.org WebFetch 403 (Cloudflare). 추가 정밀 확정은 등록 대행사 (Namecheap / Cloudflare / 가비아) 사이트 직접 조회 필요.

#### ② npm 패키지명 가용성
- 상태: **가용** — `https://registry.npmjs.org/inkvas` HTTP 404 + `npm search ?text=inkvas` 0 results.
- 결정: `@inkvas` scope 즉시 확보 권장 (npm publish 1회로 점유). 모든 패키지를 scope 안에 배치 (`@inkvas/core`, `@inkvas/enterprise`, `@inkvas/host-react`, `@inkvas/host-vue`). unscoped `inkvas` 는 *보조 점유* (선택).
- 실제 점유 액션은 Phase 5+ (첫 publish 시점) 까지 보류. 단, Phase 0 종료 시 *예약 placeholder* 1회 publish 권장 (선점).

#### ③ GitHub Org 가용성
- 상태: **가용** — `https://api.github.com/users/inkvas` HTTP 404 + search 0 matches. `inkvas-*` 유사 충돌도 없음.
- **결정 (Phase 0)**: 본 ADR Accepted 시점에서는 *org 미생성*. Inkvas 의 GitHub 레포는 1차로 사용자 개인 계정 `nckdgns3167` 아래에 박힘 (`nckdgns3167/inkvas-core`, `nckdgns3167/inkvas-enterprise`) — 기존 c3 레포 패턴 (`nckdgns3167/c3`) 과 정합.
- **org 생성 시점 (예약)**: Phase 6~7 (Enterprise/솔루션화 진입) 단계에서 *브랜드 분리* 필요할 때 `inkvas` org 를 GitHub 웹 UI 로 생성 (`gh` API 로는 일반 사용자가 org 생성 불가) → 두 레포 transfer. 본 ADR 의 *예약 사항* 으로 박힘.
- 1순위 reservation 보호: 본 ADR Accepted 직후에도 `inkvas` org 명은 *선점되지 않은 상태로 외부 노출* — 누구나 가로채기 가능. 후속 작업 트래커: 사용자가 *빠른 시일 내* GitHub 웹 UI 에서 `inkvas` org 를 *빈 org 로 사전 점유* 권장 (org 생성 자체는 무료).

#### ④ 한국 상표 KIPRIS 1차 검색
- 상태: **1차 일치 없음 (잠정)** — WebSearch `"inkvas" trademark site:kipris.or.kr OR "잉크바스" trademark` 결과: 직접 출원 record 미발견. (검색 도구가 KIPRIS DB 내부를 직접 query 하지 못해 표면적 결과만.)
- 한계: KIPRIS 정밀 조회는 사이트 직접 방문 필요 (`https://www.kipris.or.kr/khome/search/searchResult.do?tab=trademark` 에서 `Inkvas` / `잉크바스` 키워드 + *제9류 (소프트웨어)* · *제42류 (SaaS)* 검색).
- 후속 작업 트래커: 사용자가 *Phase 7 솔루션화 진입 전* KIPRIS 직접 검색 + 변리사 자문 (정식 출원 트랙은 별도).
- 의사결정 룰: 정밀 검색에서 정확 일치 출원 발견 시 *변형 후보* (`Inkvas Studio`, `InkvasApp`, `Inkvas Canvas` 등) 검토 → 사용자 confirm 후 ADR-0000a supersede.

### 후속 작업 트래커 (Phase 0 통과 후 사용자 직접 수행)

| # | 액션 | 기한 | 책임 |
|---|---|---|---|
| T1 | `inkvas.app` 도메인 등록 (1순위) + `inkvas.io` 보조 등록 (선택) | Phase 5 이전 | 사용자 |
| T2 | GitHub `inkvas` org 빈 org 로 사전 점유 (브랜드 보호) | 1주 내 권장 | 사용자 |
| T3 | npm `@inkvas` scope 점유 (placeholder publish 1회) | Phase 5 이전 | 사용자 또는 Claude (Phase 5 시점) |
| T4 | KIPRIS 정밀 상표 검색 + 변리사 자문 | Phase 7 이전 | 사용자 |
| T5 | KIPRIS 상표 정식 출원 | Phase 7 이후 | 사용자 |

### 트레이서블 의무
- 본 ADR 의 *Decision* 항목이 변경되거나 보강될 때마다 **supersede ADR** 작성 (ADR-0000a, 0000b ...) — 단순 Consequences 갱신은 인라인 commit 으로 가능.
- 본 ADR 은 `docs/business-direction.md`, `docs/business/usp.md`, `docs/business/license-boundary.md` 의 *상위 헌법* 이다. 하위 문서에서 본 ADR 의 (1)~(5) 와 충돌하는 표현 발견 시 *하위 문서 수정*.

# ADR-0012: Retro & Postmortem 정책 — Plan-as-Code 통합, Pre-mortem ↔ Post-mortem 페어링

- Status: **Accepted (2026-05-12)** — 사용자 confirm 완료
- Constraints affected: 전 Phase (작업 회고)
- Related ADRs: ADR-0002 (Plan-as-Code), ADR-0015 (Cross-review)
- Related plans: `docs/plans/_template.md`, `docs/postmortems/_template.md`

> 본 ADR 은 c3 ADR-0013 (`docs/c3/adr/0013-retro-and-postmortem-policy.md`) 의 *PDF 도메인 substitute* 포팅. Inkvas 특화: USP 5종 회고 강제 + 옛 viewer 부채 5종 재발 여부 점검.

## Context

회고 (retro) 와 사고 회고 (postmortem) 는 학습 루프의 *기계적 게이트* 가 아니면 *습관 휘발*. 솔로 dev + AI 위임 환경에서는:

- *Plan 의 Pre-mortem* 이 작성 시점 사각 노출
- *동일 plan 의 Post-mortem* 이 실행 후 *실제 발현 위험* 기록
- 두 섹션이 *같은 파일* 에 있어야 *예측 vs 실제* 비교가 자연 → 학습 가치 코어

또한, *사건 (incident)* 발생 시:
- Blameless 회고 (사람 X, 시스템 O)
- 5 Whys 시스템 원인 분석
- Action items 가 *백로그 통합* — feature_list.json 에 새 F-XXX 매핑

이 두 트랙 (plan 회고 ↔ 사고 회고) 이 *명확히 분리* 되어야 각 트랙이 무거워지지 않는다.

## Decision

### 1. Plan 회고 (Pre-mortem ↔ Post-mortem 페어링)

`docs/plans/NNNN-*.md` 한 plan 파일 안에 *두 섹션* 강제:

| 시점 | 섹션 | 내용 |
|---|---|---|
| plan 작성 (status: proposed) | `## Pre-mortem` | "이 plan 이 6개월 후 실패한다면 왜?" — 보이지 않는 위험 가시화. 5~15줄. Inkvas 특화: USP-1~5 위반 가능성 / 옛 viewer 부채 5종 (paper.js 직렬화 / eraser O(N²) / 텍스트 회귀 / 메모리 부담 / 단편 prop 폭발) 재발 위험 / 태블릿 60fps 회귀 위험 점검. |
| feature done 처리 _전_ (status: executed 직전) | `## Post-mortem` | 실제 발현 위험 + Pre-mortem 예측 비교 + 다음에 가져갈 학습. 5~10줄. *Pre-mortem 예측 vs 실제 발현* 표 권장. |

### 2. Plan Post-mortem 기계 검증

`scripts/validate-feature-list.ts` cross-validation 6:

```
for each feature where status == "done":
  매핑된 plan 파일에 ## Post-mortem 섹션 존재 ∧ body.length >= 20 자
  → 미충족 시 init.sh FAIL (feature done 차단)
```

### 3. 사고 회고 (Postmortem) — `docs/postmortems/`

| 사건 분류 | 트리거 | 위치 |
|---|---|---|
| Severity P0/P1 (서비스 중단 / 주요 기능 손상) | 무조건 postmortem | `docs/postmortems/YYYY-MM-DD-<title>.md` |
| Severity P2 (부분 손상, 사용자 영향 있음) | postmortem | 동일 |
| Severity P3 (관찰 가능 이슈, 직접 사용자 영향 없음) | `claude-progress.md` 한두 줄 | (postmortem 아님) |
| *다른 사람 / 6개월 뒤의 나가 같은 문제 겪을 가능성* | postmortem | 동일 |

Inkvas 특화 P0 트리거:
- USP-1 (위변조방지) hash chain 무결성 위반 — *법적·컴플라이언스 영향*
- USP-5 (영속성) stroke·어노 데이터 손실 — *사용자 작업 손실*
- 태블릿 60fps 회귀 — *B4 사용자 환경 제약 위반*

### 4. Postmortem 표준 섹션 (`docs/postmortems/_template.md`)

1. **요약** (3~5줄)
2. **타임라인**
3. **영향** — Inkvas 특화: USP-1/5 위반 / 위변조 hash chain 영향 / 협업·동시 편집 영향 / 호스트 임베드 충격
4. **5 Whys** (5 단계 이상)
5. **잘 갔던 것**
6. **잘못 갔던 것** — 게이트 누락 (init.sh / validate.ts / manual-freshness / audit-freshness) / 테스트 누락 / ADR 누락
7. **Action items** — **반드시 `feature_list.json` 새 F-XXX 매핑**
8. **Related ADRs / Plans**
9. **Pre-mortem 비교** (관련 plan 에 Pre-mortem 있었던 경우)

### 5. Action items → 백로그 통합 (강제)

postmortem 의 action item 이 백로그에 들어가지 않으면 사고가 *반복*. 본 ADR 강제 규칙:

- 모든 P0/P1/P2 postmortem 의 action items 는 `feature_list.json` 에 새 F-XXX 매핑 *필수*.
- 헌법 변경 필요 시 (예: 새 ADR / 19 constraints 보강) action item 으로 ADR 신규 또는 supersede 명시.
- `audit_ref: original` 권장 (사고 회고에서 유래한 feature).

### 6. Blameless 원칙

postmortem 문서 에서는 *시스템* 만 다룬다. 사람 이름·롤은 *역할* 로만 표현 (예: "에이전트가 정시 알림 못 받음" 이 아니라 "monitoring → on-call 알림 게이트 누락"). Blame 은 *학습을 위축*. 시스템 결함이 *재발 가능성* 의 진짜 원인.

## Alternatives Considered

### (a) Postmortem 미강제 (ad-hoc 회고)

- Pros: 부담 0
- Cons (강함): 솔로 dev 가 *시간 압박* 시 가장 먼저 생략. 학습 루프 영구 휘발.

### (b) Pre-mortem 만, Post-mortem 미강제

- Pros: 작성 부담 절반
- Cons (강함): Pre-mortem 예측 vs 실제 발현 비교 *없음* → 학습 가치 코어 소실. 그냥 "사고 났네" 로 끝남.

### (c) Pre-mortem + Post-mortem 을 *별도 파일*

- Pros: 각 파일 깔끔
- Cons (강함): *짝지어 보기* 가 마찰 — 파일 2개 열어야 비교 가능. 같은 파일에 두면 *자연스럽게* 함께 보임.

## Consequences

### 직접 박힘

- `docs/plans/_template.md` 의 ## Pre-mortem / ## Post-mortem 섹션
- `docs/postmortems/_template.md` 의 9 섹션
- `scripts/validate-feature-list.ts` rule 6 (Plan Post-mortem 비어있지 않음)
- AGENTS.md §3.4 의 작업 시작 전 체크리스트 #9 (Post-mortem 작성 강제)

### Trade-off

- 회고 작성 부담: 5~10분/plan, 30분~2시간/postmortem
- *학습 가치* 와 trade. 솔로 + AI 환경에서 *기억* 만으로는 불가능. 글쓰기가 *시스템 사고 강화* 도구.

### 트레이서블 의무

- 본 ADR 변경 시 ADR-0002 (Plan-as-Code), ADR-0015 (Cross-review) 영향 확인.
- c3 ADR-0013 의 supersede 또는 fork 명시 (역사적 기원).

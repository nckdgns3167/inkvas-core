# ADR-0002: Plan-as-Code — `docs/plans/` 를 Plan 영구화 SSOT 로

- Status: **Accepted (2026-05-12)** — 사용자 confirm 완료
- Constraints affected: 전 Phase (작업 절차)
- Related ADRs: ADR-0012 (Pre/Post-mortem 페어링), ADR-0015 (Cross-review)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` (본 ADR 의 *첫 적용 사례*)

> 본 ADR 은 c3 ADR-0010 (`docs/c3/adr/0010-plan-as-code.md`) 의 *PDF 도메인 substitute* 포팅. 핵심 정신 (plan 을 ADR 과 동급 산출물로 영구화) 은 그대로, 절차·트리거는 Inkvas 도메인으로 적응.

## Context

솔로 개발자 + AI 에이전트 위임 체제에서 *plan 의 휘발성* 은 *시스템 사고* 의 주된 원인:

- Claude Code `EnterPlanMode` 로 만든 plan 은 `.claude/plans/<random>.md` 에 저장 — `.gitignore` 대상 + 사용자별 + 세션 종료 시 컨텍스트 휘발.
- AI 가 plan 단계의 *근거* 를 까먹은 채 *실행만* 따라가면 사고 시 *왜 그렇게 했나* 추적 불가.
- 6개월 후의 자기 자신 / 합류자 / 외부 cross-reviewer 가 plan 의 *Pre-mortem* (예측 위험) 과 *Post-mortem* (실제 발현) 을 짝지어 학습 불가.

ADR 은 *비타협 결정 근거*. plan 은 *실행 계획*. 둘은 *분리* 되어야 하지만 *동등한 영구성* 으로 박혀야 학습 루프가 닫힘.

## Decision

`docs/plans/NNNN-<topic>.md` 를 *plan 영구화 SSOT* 로 박는다.

### 1. 명명 + frontmatter 강제

```yaml
---
id: 0001
title: <짧은 제목>
status: proposed | approved | executed | superseded
created: YYYY-MM-DD
related_features: [F-XXX, ...]
related_adrs: [ADR-XXXX, ...]
related_usps: [USP-1, USP-3, ...]
risk_class: critical | mid | easy
supersedes: 0000
superseded_by: 9999
---
```

`scripts/validate-feature-list.ts` 의 cross-validation 6/6a/7 이 plan frontmatter + 섹션 존재를 *기계 검증*.

### 2. 표준 섹션 강제 (`docs/plans/_template.md` 가 SSOT)

- `## Context`, `## Goal`, `## Approach`, `## Risks`
- `## Pre-mortem` — 작성 시점에 *6개월 후 실패 가설* (강제, ADR-0012)
- `## Verification` — 통과 조건
- `## Status log`
- `## Post-mortem` — 실행 후 회고 (강제, ADR-0012)
- `## Cross-review` — `risk_class: critical/mid` 시 강제 (ADR-0015)

### 3. Claude Code plan 모드 ↔ 영구화 sequence

```
[1] Claude Code EnterPlanMode → draft 작성 (.claude/plans/<random>.md, .gitignore 대상)
[2] ExitPlanMode → 사용자 승인
[3] 백포팅 (수동) → docs/plans/NNNN-<topic>.md (frontmatter + Pre-mortem 추가)
[4] git commit (status: approved)
[5] 실행 후 commit SHA + Post-mortem 추가 (status: executed)
```

### 4. supersede 체인

- 작은 변경: 같은 파일 git edit (history 는 git 이 추적)
- 방향 전환: 새 파일 + 양쪽 frontmatter 의 `supersedes` / `superseded_by` 연결 + 이전 파일 `status: superseded`
- 회고 시 supersede 체인을 따라가면 *어떻게 진화했나* 가시화

### 5. ADR 과의 분리

| | ADR | Plan |
|---|---|---|
| 다룬 것 | *비타협 결정 근거* | *실행 계획* |
| 수명 | *영원* (supersede 만 가능) | *실행 후 archive 가능* (supersede 또는 done) |
| 위치 | `docs/adr/XXXX-*.md` | `docs/plans/NNNN-*.md` |
| 분야 | "왜 이 선택을 했나" | "어떻게·언제 실행할까" |
| 트리거 | 새 *비타협* 결정 도입 PR | 새 *작업 묶음* 시작 |

## Alternatives Considered

### (a) Plan 을 GitHub Issue/Project 로

- Pros: 외부 가시성 (협업자 댓글), 칸반 UI
- Cons (강함): SSOT 분산 — feature_list.json 과 GitHub Projects 둘 다 진실이 되면 DRY 위반. AGENTS.md §0 의 "GitHub Issues 백로그·Projects 칸반보드·Wiki 의도적 미사용" 정책 위반.

### (b) Plan 을 README / NOTION / Confluence 등 외부 도구로

- Pros: rich text 편집, 협업 댓글
- Cons (강함): git log 와 plan 진화가 *분리* — supersede 체인 추적 불가. 솔로 + AI 환경에 *추가 도구* = 추가 인지 부담.

### (c) Plan 미도입 (ADR 만으로 충분?)

- Pros: 단순
- Cons (강함): ADR 이 *실행 계획* 을 다루기 시작하면 ADR 의 정체성 (결정 근거) 이 흐려짐. Pre-mortem/Post-mortem 이 ADR 에 들어가면 ADR 이 *실행 후 변경* 되어야 함 — ADR 의 영원성 침해.

## Consequences

### 직접 박힘

- `docs/plans/0001-bootstrap-from-zero.md` 가 본 ADR 의 *첫 적용 사례* (Phase 0 첫 작업에서 이주됨)
- `docs/plans/_template.md` 가 다음 plan 의 시작점
- `docs/plans/README.md` 가 사용 가이드
- `scripts/validate-feature-list.ts` 의 rule 6/6a/7 이 plan 의 ## Post-mortem / ## Cross-review 섹션 존재·내용 검증
- AGENTS.md §0 + §3.4 가 본 절차 강제

### Trade-off

- Plan 작성 부담 증가: 모든 작업 묶음마다 plan 작성. 솔로 dev 에는 *5분 부담*, *6개월 후 학습 가치* 와 trade.
- Pre-mortem 강제는 *plan 작성 시점* 에 사각 위험 발굴 — 시간 박스 권장 (1 plan 당 Pre-mortem 5~15줄).

### 트레이서블 의무

- 본 ADR 변경 시 c3 ADR-0010 의 supersede 또는 fork 명시 (역사적 기원).
- ADR-0012 (Pre/Post-mortem) + ADR-0015 (Cross-review) 는 본 ADR 의 *후속* — 본 ADR 변경 시 두 ADR 영향 확인.

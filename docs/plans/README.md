# Plans

Inkvas 의 plan SSOT (ADR-0002, c3 ADR-0010 port). ADR 과 동급 첫 클래스 산출물 — *결정 근거*는 ADR, *실행 계획*은 여기.

## 명명 규칙

`NNNN-<topic>.md` (4자리 시퀀스, ADR 형식 일관)

- `0001-bootstrap-from-zero.md` (Phase 0~7 전체 부트스트랩)
- `0002-...md` (Phase 1 단위 작업)
- ...

## 표준 frontmatter

```yaml
---
id: 0001
title: <짧은 제목>
status: proposed | approved | executed | superseded
created: YYYY-MM-DD
related_features: [F-XXX, ...]      # 선택
related_adrs: [ADR-XXXX, ...]       # 선택
related_usps: [USP-1, USP-3, ...]   # 선택 (이 plan 이 어느 USP 를 진척시키는가)
risk_class: critical | mid | easy   # ADR-0015 cross-review 트리거 (필수)
supersedes: 0000                    # 진화 추적 (선택)
superseded_by: 9999                 # 진화 추적 (선택)
---
```

## 표준 섹션

```markdown
## Context

왜 이 plan 이 필요한가 — 문제·배경·제약. legacy assets / competitive audit / USP 매트릭스의 어느 row 가 트리거?

## Goal

무엇을 달성하는가 — 명확한 outcome. 측정 가능 형태.

## Approach

어떻게 할 것인가 — 작업 순서·기술 결정·범위.

## Risks

실패 가능성과 mitigation. 특히 *옛 viewer 부채 5종* 재발 가능성 명시.

## Pre-mortem (강제, ADR-0012)

"이 plan 이 6개월 후 실패했다면 왜 실패했을까?" 미리 적기.
실제 위험을 발굴하는 효과적 도구. plan 작성 시점에 보이지 않는 사각 노출.
태블릿 60fps (B4) / 자유 캔버스 좌표 (USP-4) / 위변조 hash chain 호환 (C7) / RBAC 누락 (E17) 등 *교차 USP 의존* 위험 우선 점검.

## Verification

어떻게 성공을 측정할지 — 통과 조건, 자동 검증 가능 여부.
태블릿 게이트 (Galaxy Tab S9 FE+) / 자유 캔버스 게이트 / 위변조 게이트 명시.

## Status log

- YYYY-MM-DD: proposed
- YYYY-MM-DD: approved (사용자 승인)
- YYYY-MM-DD: executed (commit SHA)
- YYYY-MM-DD: superseded by 0042 (선택)

## Post-mortem (feature done 처리 _전_ 강제, ADR-0012)

실행 _후_ 회고 (5~10줄):

- 추정 vs 실제
- 잘된 것
- 어려웠던 것
- 다음 feature 에 가져갈 것
- 백로그 영향 (새 F-XXX 또는 기존 보강)
- 옛 viewer 부채 재발 여부 (특히 paper.js 직렬화 / eraser O(N²) / 텍스트 회귀 / 메모리 부담 / 단편 prop 폭발)

Pre-mortem 예측 vs 실제 발현 비교가 학습의 코어. validate-feature-list.ts 가 done 시 비어있지 않음 검증.
```

## 진화 추적

plan 이 _작게_ 바뀌면 같은 파일 git edit (history 는 git 이 추적). plan 이 *방향 전환* 으로 바뀌면:

1. 새 파일 생성 (다음 시퀀스 번호)
2. 새 파일 frontmatter 에 `supersedes: <이전 id>`
3. 이전 파일 frontmatter 에 `superseded_by: <새 id>`
4. 이전 파일 status: `superseded` 로 변경

회고 시 supersede 체인을 따라가면 _어떻게 진화했나_ 추적 가능.

## Cross-review (ADR-0015)

`risk_class: critical` 또는 `mid` plan 은 Codex / Gemini 등 보조 에이전트로 cross-review (PR + 코멘트 트리거). plan 안 `## Cross-review` 섹션에 결과 박음:

```markdown
## Cross-review — risk_class: critical

**Convergence (Claude + Codex 일치)**:

- ...

**Divergence (의견 차이)**:

- Claude: A
- Codex: B
- 결정: B (이유 ...)

**단독 catch (Codex 또는 Gemini 단독)**:

- (P0/P1 코멘트 핵심)

**Status**:

- review 트리거: 2026-MM-DD HH:MM (PR #N)
- review 통과: 2026-MM-DD HH:MM
```

`validate-feature-list.ts` cross-validation 7번째: feature done 시 매핑 plan 이 `risk_class: critical` 이면 `## Cross-review` 섹션 비어있지 않음 검증 (mid 는 권장이지 강제 X).

## Pre-mortem ↔ Post-mortem 페어링 (ADR-0012)

| 시점 | 섹션 | 내용 |
|---|---|---|
| plan 작성 (status: proposed) | Pre-mortem | "이 plan 이 6개월 후 실패한다면 왜?" — 보이지 않는 위험 가시화 |
| feature done 처리 _전_ (status: executed 로 가기 직전) | Post-mortem | 실제 발현 위험 + Pre-mortem 예측과의 차이 + 다음에 가져갈 학습 |

`validate-feature-list.ts` 가 feature `status=done` 시 plan 에 Post-mortem 섹션 비어있지 않음 검증. 통과 안 하면 done 안 닫힘 → 회고가 *기계적 게이트* 에 묶임.

## Claude Code plan 모드와의 정합

Claude Code plan 모드는 `.claude/plans/<random>.md` 를 자동 생성 — _draft 단계_. user-specific + `.gitignore`. 사용자 승인된 plan 은 _수동으로_ 이 디렉토리에 `NNNN-<topic>.md` 로 백포팅.

draft → 영구화 sequence:

1. Claude Code `EnterPlanMode` → draft 작성
2. `ExitPlanMode` → 사용자 승인
3. 백포팅 → `docs/plans/NNNN-...md` (frontmatter + Pre-mortem 추가)
4. `git commit` (status: approved)
5. 실행 후 commit SHA 추가 (status: executed)

## 인덱스

- [0001 — Bootstrap from zero (Phase 0~7 전체)](./0001-bootstrap-from-zero.md) (Phase 0 executed, Phase 1+ in progress, risk_class: critical)

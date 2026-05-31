# ADR-0015: Cross-review 정책 — critical / mid plan 의 보조 에이전트 검토 (PR + @codex/@gemini review)

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: 전 Phase (plan 검토 절차)
- Related ADRs: ADR-0002 (Plan-as-Code — risk_class 정의), ADR-0012 (Pre/Post-mortem)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §"바이타협 결정" — c3 ADR-0014 port

> 본 ADR 은 c3 ADR-0014 (`docs/c3/adr/0014-multi-agent-plan-cross-review.md`) 의 *PDF 도메인 substitute* 포팅. 핵심 정신 (단일 AI 의 *시각 사각* 보완) 유지.

## Context

솔로 + AI 환경의 *결정 위험*:
- 단일 AI 가 plan 의 *시각 사각* (overlooked risk, untested assumption) 을 *놓침*
- 사용자가 *컨텍스트 압박* 시 빠른 승인 → 6 개월 후 사고
- *위험 차등 관리* 없으면 모든 plan 에 동일 검토 부담 = 솔로 dev *시간 압박*

c3 의 검증된 패턴:
- **risk_class: critical** — 보조 에이전트 (Codex / Gemini) cross-review *강제*
- **risk_class: mid** — cross-review *권장*
- **risk_class: easy** — skip

본 ADR 은 *Inkvas 도메인 특화* 확장.

## Decision

**risk_class 3 종 + 강제·권장·skip + plan 안 `## Cross-review` 섹션 + validate.ts rule 7 검증**.

### 1. risk_class 정의 (Inkvas 도메인 특화)

```yaml
# plan frontmatter
risk_class: critical | mid | easy
```

**critical** — 다음 중 하나라도 해당:
- 본 plan 이 *비타협 결정* (ADR 신규 또는 supersede) 을 *유발*
- D11/C7/C8 적용 (마이그레이션·hash chain·영속)
- USP-1~5 중 *어느 하나* 의 핵심 구현
- 호스트 통합 contract (ADR-0009) 의 메시지 schema 변경
- 라이선스 경계 (ADR-0013) 변경

**mid** — 다음 중 하나:
- 새 UX 시그니처 도입 (옛 viewer 의 재현 필수 UX 외)
- 새 의존성 (`pnpm i ...`) 도입
- a11y 영향 가능 (D12)
- 메뉴얼 영향 (D14 manual_impact="new-chapter")

**easy** — 위 외 (단순 버그 수정, 의존성 patch, 메뉴얼 wording 수정 등).

### 2. Cross-review 트리거 (critical 강제)

```
[1] plan 작성 (risk_class: critical)
[2] PR 생성 + 라벨 'cross-review-needed'
[3] PR 본문에 @codex review 또는 @gemini review 멘션 (보조 에이전트 트리거)
[4] 보조 에이전트가 plan + diff 검토 → 코멘트 제출
[5] Convergence / Divergence / 단독 catch 추출 → plan 의 `## Cross-review` 섹션 박음
[6] Divergence 해소 (Claude vs 보조 에이전트 결정 명시)
[7] PR merge 가능
```

### 3. Plan 안 `## Cross-review` 섹션 양식

```markdown
## Cross-review — risk_class: critical

**Convergence (Claude + 보조 에이전트 일치)**:
- ...
- ...

**Divergence (의견 차이)**:
- Claude: A
- Codex: B
- 결정: B (이유: 옛 viewer 부채 #2 재발 위험 명시 — Codex 가 정확히 catch)

**단독 catch (Codex / Gemini 단독)**:
- (P0) ...
- (P1) ...

**Status**:
- 트리거: 2026-MM-DD HH:MM (PR #N)
- 통과: 2026-MM-DD HH:MM
```

### 4. validate-feature-list.ts rule 7 (이미 박힘)

`feature.status === 'done'` + 매핑 plan 의 `risk_class: critical` 인데 plan 의 `## Cross-review` 섹션 비어있으면 init.sh fail. (Phase 1 에 이미 구현됨.)

### 5. 보조 에이전트 후보

| 후보 | 특징 |
|---|---|
| **Codex (GPT-5 등)** | OpenAI Codex CLI / VS Code 확장. PR 댓글 자동화. c3 1차 채택. |
| **Gemini (Google)** | Gemini Code Assist. 무료 tier 일부 사용 가능. |
| **Claude self-review** (다른 세션) | 동일 모델 *세션 격리* — *컨텍스트 분리* 가 약함 (편향 가능). 최후 수단. |

Inkvas Phase 1 시점: Codex 1차 채택 (c3 정합), Gemini 백업.

### 6. Inkvas 특화 검토 항목

보조 에이전트 검토 시 *반드시 검사* 항목 (`docs/cross-review-guide.md` Phase 3+ 박힘 예정):

- 옛 viewer 부채 5종 (paper.js / eraser / 텍스트 / 메모리 / 단편 prop) 재발 가능성
- USP-1~5 중 *교차 의존* (예: CRDT op 가 hash chain 의 input 통과?)
- 태블릿 60fps 회귀 가능성 (ADR-0018)
- 자유 캔버스 좌표 (USP-4) 정합
- license-boundary 위반 가능성 (A1/A3)
- a11y 영향 (D12 — 자동 검증 외의 *시각 사각*)

## Alternatives Considered

### (a) Cross-review 없음 (단일 AI)

- Cons (결정적): 시각 사각 사고 누적. 6개월 후 *돌이킬 수 없는* 부채.

### (b) 모든 plan cross-review (risk_class 차등 없음)

- Cons: 솔로 dev *시간 압박 폭증*. easy plan 까지 검토는 *over-engineering*.

### (c) Risk-class 차등 + critical 강제 ← **채택** (c3 ADR-0014 port)

- 검증된 패턴
- 솔로 dev 시간 *적절* 분배

## Consequences

### 직접 박힘

- `validate-feature-list.ts` rule 7 (이미 박힘 Phase 1)
- `docs/plans/_template.md` 의 `## Cross-review` 섹션 (이미 박힘 Phase 1)
- `docs/cross-review-guide.md` (Phase 3+ 박힘) — Inkvas 특화 검토 항목

### Phase 매핑

- **Phase 1~2** — plan 자체 risk_class: critical, 본 ADR 의 Cross-review 적용 (self-bootstrapping skip 허용)
- **Phase 3+** — *모든* critical plan 에 cross-review 강제 적용

### Trade-off

- 보조 에이전트 사용 비용 (Codex API / Gemini tier) — *critical 만* 강제로 비용 제어.
- *Divergence 해소* 가 사용자 시간 소비 — *Claude vs Codex 결정 사유* 명시 의무로 학습 누적 (글쓰기 = 학습).

### Risk class

**mid** — 본 ADR 변경은 plan 절차 영향, 코드 직접 영향 0.

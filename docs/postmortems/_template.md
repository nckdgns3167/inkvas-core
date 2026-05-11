# Postmortem — &lt;사건 한 줄 요약&gt;

**Date**: YYYY-MM-DD
**Author**: <작성자>
**Severity**: P0 (서비스 중단) / P1 (주요 기능 손상) / P2 (부분 손상) / P3 (관찰 가능)
**Related plan / feature**: plan 0XXX / F-XXX
**Related ADR**: ADR-XXXX (해당 시)

> **Blameless 원칙** (ADR-0012). "누가 잘못했나" 가 아니라 *시스템이 어떻게 이 사고를 가능하게 했나*. 사람 X, 시스템 O.

---

## 1. 요약 (Summary)

3~5줄. 무슨 일이 일어났는지 / 사용자 영향 / 발견 → 복구 시간.

## 2. 타임라인 (Timeline)

- YYYY-MM-DD HH:MM — 트리거 / 변경 commit SHA
- YYYY-MM-DD HH:MM — 첫 알람 / 사용자 보고
- YYYY-MM-DD HH:MM — 원인 가설 1
- YYYY-MM-DD HH:MM — 원인 가설 1 reject
- YYYY-MM-DD HH:MM — 진짜 원인 발견
- YYYY-MM-DD HH:MM — 핫픽스 commit SHA
- YYYY-MM-DD HH:MM — 복구 확인

## 3. 영향 (Impact)

- 영향 받은 사용자 수 / 도구·기능
- 데이터 손실 여부 (Inkvas 의 경우 stroke·어노 손실 시 USP-5 위반 — 별도 강조)
- 위변조 hash chain 무결성 영향 (USP-1 — 영향 있으면 P0)
- 협업·동시 편집 영향 (USP-2/3)
- 호스트 임베드 충격

## 4. 5 Whys (시스템 원인 분석)

표면 원인이 아닌 *시스템 원인* 까지. 5 단계 이상 권장.

1. Why: <표면 원인>
2. Why: <한 단계 깊은 원인>
3. Why: <시스템 결함>
4. Why: <프로세스 결함>
5. Why: <헌법·게이트 누락>

## 5. 무엇이 잘 갔는가 (What went well)

학습 동등 가치. 신속 감지 / 자동화된 롤백 / 모니터링 / 매뉴얼 정합.

## 6. 무엇이 잘못 갔는가 (What went poorly)

- 게이트 누락 (init.sh, validate.ts, 메뉴얼 freshness, audit freshness)
- 테스트 누락 (acceptance.verifiable 의 어느 항목이 비어있었나)
- ADR 누락 (해당 결정이 ADR 로 박혔다면 막혔을까?)

## 7. Action Items (백로그 통합)

> **반드시 `feature_list.json` 에 새 F-XXX 로 매핑** (ADR-0012). action item 이 backlog 에 들어가지 않으면 사고가 *반복*.

- [ ] F-XXX : <action item 한 줄> — `category: ops`, `applies_constraints: [...]`, `audit_ref: original`
- [ ] F-XXX : ...
- [ ] (헌법 변경 필요 시) AGENTS.md / ADR-XXXX 신규 또는 supersede 액션

## 8. Related ADRs / Plans

- ADR-XXXX (관련 결정)
- plan 0XXX (실행 컨텍스트)

## 9. Pre-mortem 비교 (관련 plan 에 Pre-mortem 있었던 경우)

| Pre-mortem 예측 | 실제 발현 | 일치 / 의외 |
|---|---|---|
| ... | ... | ... |

학습: Pre-mortem 이 실제 사고 시나리오를 *어디까지* 예측했는가. 사각 부분이 ADR 변경 트리거.

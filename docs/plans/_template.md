---
id: 0XXX
title: <짧은 제목>
status: proposed
created: 2026-MM-DD
related_features: []
related_adrs: []
related_usps: []
risk_class: easy
---

## Context

왜 이 plan 이 필요한가 — 문제·배경·제약.

## Goal

무엇을 달성하는가 — 명확한 outcome, 측정 가능 형태.

## Approach

어떻게 할 것인가 — 작업 순서·기술 결정·범위.

## Risks

실패 가능성과 mitigation. 옛 viewer 부채 5종 (paper.js 직렬화 / eraser O(N²) / 텍스트 회귀 / 메모리 부담 / 단편 prop 폭발) 재발 가능성 명시.

## Pre-mortem (강제, ADR-0012)

"이 plan 이 6개월 후 실패했다면 왜 실패했을까?" 5~10줄. 보이지 않는 사각 노출. 교차 USP 의존 위험 (B4 태블릿 / USP-4 자유 캔버스 / C7 hash chain / E17 RBAC) 우선 점검.

## Verification

성공 측정 방법 — 통과 조건, 자동 검증 가능 여부. 태블릿 게이트 / 자유 캔버스 게이트 / 위변조 게이트 명시.

## Status log

- 2026-MM-DD: proposed

## Post-mortem (feature done 처리 _전_ 강제, ADR-0012)

> _실행 후 5~10줄 작성. 비우면 init.sh manual-freshness fail 동등, validate.ts done 차단._
>
> - 추정 vs 실제 (estimate vs actual)
> - 잘된 것
> - 어려웠던 것
> - 다음 feature 에 가져갈 것
> - 백로그 영향 (새 F-XXX 또는 기존 보강)
> - 옛 viewer 부채 재발 여부

## Cross-review (risk_class: critical / mid 시 강제, ADR-0015)

> _critical: 강제 cross-review. mid: 권장. easy: skip._
>
> **Convergence**: ...
>
> **Divergence**: ...
>
> **단독 catch**: ...
>
> **Status**: 트리거 2026-MM-DD / 통과 2026-MM-DD

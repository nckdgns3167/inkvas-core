#!/usr/bin/env bash
# Inkvas init.sh — AGENTS.md 3.2 (init.sh 게이팅) 통합 헬스체크.
# 한 단계라도 실패 시 비제로 종료 (set -e).
# pre-commit 훅 + GitHub Actions 에서 동일 호출.
#
# Phase 1 시점: deps install + validate:features + audit-freshness 만 활성.
# Phase 2+ : typecheck/lint/test (ADR-0003 프레임워크 결정 후).
# Phase 3+ : a11y axe + boundaries lint + manual-freshness.
# Phase 5+ : migration dry-run.
#
# 진행 페이즈는 feature_list.json 의 phases 상태로 자동 분기.

set -e

cd "$(dirname "$0")"

# 페이즈 자동 감지 — feature_list.json phases 의 active 페이즈 중 최고 번호
detect_phase() {
  if [ ! -f feature_list.json ]; then
    echo 0
    return
  fi
  # phases.phase_N.status == "active" 또는 "completed" 인 N 중 최대
  node -e '
    const fs = require("fs");
    try {
      const fl = JSON.parse(fs.readFileSync("feature_list.json", "utf-8"));
      const phases = fl.phases || {};
      let max = 0;
      for (const [key, val] of Object.entries(phases)) {
        const m = key.match(/^phase_(\d+)$/);
        if (!m) continue;
        if (val.status === "active" || val.status === "completed") {
          max = Math.max(max, parseInt(m[1], 10));
        }
      }
      console.log(max);
    } catch (e) { console.log(0); }
  ' 2>/dev/null || echo 0
}

CURRENT_PHASE="$(detect_phase)"
echo "==> Inkvas init.sh (current phase = ${CURRENT_PHASE})"

# Phase 1+ baseline checks
echo "[1/9] pnpm install"
if command -v pnpm >/dev/null 2>&1; then
  if [ -f pnpm-lock.yaml ]; then
    pnpm install --frozen-lockfile
  else
    pnpm install
  fi
else
  echo "  ✗ pnpm not installed — install with 'npm install -g pnpm' or 'corepack enable'"
  exit 1
fi

echo "[2/9] validate feature_list (schema + 14 cross-validation)"
pnpm validate:features

echo "[3/9] audit freshness (competitive-feature-audit.md, D15)"
pnpm audit:freshness

# Phase 2+ activation
if [ "${CURRENT_PHASE}" -ge 2 ]; then
  echo "[4/9] typecheck (tsc --noEmit)"
  pnpm typecheck

  echo "[5/9] lint + boundaries (ESLint with boundaries plugin)"
  pnpm lint
else
  echo "[4/9] typecheck (deferred — Phase 2+)"
  echo "[5/9] lint + boundaries (deferred — Phase 2+, ADR-0013)"
fi

if [ "${CURRENT_PHASE}" -ge 3 ]; then
  echo "[6/9] test (vitest run)"
  pnpm test

  echo "[7/9] a11y axe (WCAG 2.1 AA, D12)"
  pnpm test:a11y

  echo "[8/9] manual freshness (D14, ADR-0014)"
  pnpm test:manual-freshness
else
  echo "[6/9] test (deferred — Phase 3+)"
  echo "[7/9] a11y axe (deferred — Phase 3+, D12)"
  echo "[8/9] manual freshness (deferred — Phase 3+, D14)"
fi

if [ "${CURRENT_PHASE}" -ge 5 ]; then
  echo "[9/9] migration dry-run"
  pnpm db:migrate:dry
else
  echo "[9/9] migration dry-run (deferred — Phase 5+)"
fi

echo ""
echo "OK — Phase ${CURRENT_PHASE} gates passed."

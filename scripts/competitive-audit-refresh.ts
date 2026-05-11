/**
 * competitive-audit-refresh — docs/business/competitive-feature-audit.md 의 last_updated 신선도 검증.
 * init.sh 의 audit-freshness 단에서 호출. AGENTS.md D15 + bootstrap §Phase 1.
 *
 * - 90일 이상: 경고 (exit 0)
 * - 180일 이상: 실패 (exit 1) + AI 가 사용자에게 갱신 요청 권장
 *
 * 갱신 가이드:
 *   1. PDFaid·PSPDFKit·Foxit·Apryse·Adobe Online·pdf.js 등 6+ 경쟁사 현재 기능 1차 점검
 *   2. 매트릭스 신규 row 추가 / 기존 row P0~P2 우선순위 재평가
 *   3. last_updated + next_review_due + 변경 이력 동시 갱신
 *   4. feature_list.json 의 audit_ref 가 변경된 row 를 참조하면 동시 갱신
 *
 * 사용:
 *   tsx scripts/competitive-audit-refresh.ts        # CLI
 */
import { existsSync, readFileSync } from 'node:fs';

const AUDIT_PATH = 'docs/business/competitive-feature-audit.md';
const WARN_DAYS = 90;
const FAIL_DAYS = 180;

interface Result {
  ok: boolean;
  ageDays: number | null;
  lastUpdated: string | null;
  message: string;
}

export function checkAuditFreshness(path: string = AUDIT_PATH): Result {
  if (!existsSync(path)) {
    return {
      ok: false,
      ageDays: null,
      lastUpdated: null,
      message: `competitive-feature-audit.md not found at ${path}`,
    };
  }
  const content = readFileSync(path, 'utf-8');
  // 형식: '- last_updated: **YYYY-MM-DD**'
  const m = content.match(/last_updated:\s*\*\*(\d{4}-\d{2}-\d{2})\*\*/);
  if (!m) {
    return {
      ok: false,
      ageDays: null,
      lastUpdated: null,
      message: `last_updated 필드를 파싱하지 못함 (예상 형식: '- last_updated: **YYYY-MM-DD**')`,
    };
  }
  const lastUpdated = m[1];
  const d = new Date(lastUpdated);
  if (isNaN(d.getTime())) {
    return {
      ok: false,
      ageDays: null,
      lastUpdated,
      message: `last_updated '${lastUpdated}' 가 유효한 날짜가 아님`,
    };
  }
  const ageDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (ageDays >= FAIL_DAYS) {
    return {
      ok: false,
      ageDays,
      lastUpdated,
      message: `audit 가 ${ageDays}일 전 (>= ${FAIL_DAYS}일) — init.sh FAIL. 분기 갱신 필수 (D15).`,
    };
  }
  if (ageDays >= WARN_DAYS) {
    return {
      ok: true,
      ageDays,
      lastUpdated,
      message: `⚠ audit 가 ${ageDays}일 전 (>= ${WARN_DAYS}일) — 갱신 권장 (D15).`,
    };
  }
  return {
    ok: true,
    ageDays,
    lastUpdated,
    message: `audit fresh (${ageDays}일 전, last_updated=${lastUpdated})`,
  };
}

// CLI
const isCli =
  process.argv[1] !== undefined &&
  process.argv[1].endsWith('competitive-audit-refresh.ts');

if (isCli) {
  const result = checkAuditFreshness();
  if (!result.ok) {
    console.error(`audit-freshness: ${result.message}`);
    process.exit(1);
  }
  console.log(`audit-freshness: ${result.message}`);
}

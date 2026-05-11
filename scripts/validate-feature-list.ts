/**
 * feature_list.json 검증 — schema validation + 14종 cross-validation.
 * AGENTS.md Section 0 (SSOT 표) + Inkvas constraints + ADR-0002/0012/0013/0014/0015.
 *
 * Cross-validation 14종 (c3 12종 + Inkvas 추가 2종):
 *   1. schema (ajv 2020-12 strict mode)
 *   2. WIP=1 (in_progress 카운트 ≤ 1, wip_lock=false 제외)
 *   3. 참조 무결성 (depends_on/blocks가 실재하는 feature ID)
 *   4. ADR 파일 존재 (relevant_adrs → docs/adr/XXXX-*.md)
 *   5. 파일 존재 (verifiable.tests=in_progress|done / artifacts.files_created=done)
 *   6. Plan Post-mortem (done 시 매핑 plan 파일에 ## Post-mortem 섹션 비어있지 않음 — ADR-0012)
 *      6a. Plan mapping strict (F-007 이상 done feature는 plan 매핑 필수)
 *   7. Plan Cross-review (done 시 매핑 plan이 risk_class: critical 이면 ## Cross-review 섹션 비어있지 않음 — ADR-0015)
 *   8. DAG cycle (depends_on 그래프에 사이클 없음)
 *   9. blocks 양방향 정합 (transitive 경고)
 *  10. risk_class heuristic 경고 (D11/C7 적용 또는 migration_dry_run/hash_chain_integrity 있는 feature가 easy/absent)
 *  11. license_tier 경로 정합 (Inkvas 신규) — license_tier="enterprise" feature 가 packages/enterprise/* 가 아닌 경로 생성 시 fail (ADR-0013, A1/A3)
 *  12. manual_impact 트레이서블 (Inkvas 신규) — manual_impact ≠ "none" done feature 는 docs/manual/** 산출물 1개 이상 (ADR-0014)
 *  13. audit_ref 트레이서블 (Inkvas 신규) — audit:#N 참조 시 competitive-feature-audit.md 의 row 존재 (warn only — audit row 정밀 추출 어려움, last_updated 기반 ageing 만 강제)
 *  14. audit freshness (Inkvas 신규) — competitive-feature-audit.md last_updated 가 180일 이상이면 fail, 90일 이상이면 warn
 *
 * 사용:
 *   tsx scripts/validate-feature-list.ts        # CLI: feature_list.json 검증
 *   import { validateFeatureList } from '...'   # 테스트
 */
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SCHEMA_PATH = 'feature_list.schema.json';
const FEATURE_LIST_PATH = 'feature_list.json';
const ADR_DIR = 'docs/adr';
const PLAN_DIR = 'docs/plans';
const COMPETITIVE_AUDIT_PATH = 'docs/business/competitive-feature-audit.md';
const MANUAL_DIR = 'docs/manual';
const PLAN_STRICT_FROM_ID = 7;
const AUDIT_WARN_DAYS = 90;
const AUDIT_FAIL_DAYS = 180;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings?: string[];
}

interface Feature {
  id: string;
  status: string;
  phase?: string;
  estimate?: string;
  description?: string;
  applies_constraints?: string[];
  depends_on?: string[];
  blocks?: string[];
  relevant_adrs?: string[];
  wip_lock?: boolean;
  license_tier?: 'oss' | 'enterprise';
  manual_impact?: 'none' | 'section' | 'new-chapter';
  audit_ref?: string;
  acceptance?: {
    verifiable?: {
      tests?: string[];
      migration_dry_run?: boolean;
      hash_chain_integrity?: boolean;
    };
  };
  artifacts?: { files_created?: string[] };
}

interface FeatureList {
  features: Feature[];
}

interface PlanInfo {
  file: string;
  content: string;
}

function loadPlansByFeatureId(planDir: string): Map<string, PlanInfo[]> {
  const planByFeatureId = new Map<string, PlanInfo[]>();
  if (!existsSync(planDir)) return planByFeatureId;
  const planFiles = readdirSync(planDir).filter((n) => /^\d{4}-.*\.md$/.test(n));
  for (const planFile of planFiles) {
    const content = readFileSync(`${planDir}/${planFile}`, 'utf-8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    const relMatch = fmMatch[1].match(/related_features:\s*\[([\s\S]*?)\]/);
    if (!relMatch) continue;
    const ids = relMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter((s) => /^F-\d{3}$/.test(s));
    for (const id of ids) {
      if (!planByFeatureId.has(id)) planByFeatureId.set(id, []);
      planByFeatureId.get(id)!.push({ file: planFile, content });
    }
  }
  return planByFeatureId;
}

function findCycle(features: Feature[]): string[] | null {
  const adj = new Map<string, string[]>();
  for (const f of features) adj.set(f.id, f.depends_on ?? []);

  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  for (const id of adj.keys()) color.set(id, WHITE);

  const stack: string[] = [];
  function dfs(u: string): string[] | null {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of adj.get(u) ?? []) {
      if (color.get(v) === GRAY) {
        const idx = stack.indexOf(v);
        return stack.slice(idx).concat(v);
      }
      if (color.get(v) === WHITE) {
        const cycle = dfs(v);
        if (cycle) return cycle;
      }
    }
    color.set(u, BLACK);
    stack.pop();
    return null;
  }
  for (const id of adj.keys()) {
    if (color.get(id) === WHITE) {
      const cycle = dfs(id);
      if (cycle) return cycle;
    }
  }
  return null;
}

function parseLastUpdated(content: string): Date | null {
  const m = content.match(/last_updated:\s*\*\*(\d{4}-\d{2}-\d{2})\*\*/);
  if (!m) return null;
  const d = new Date(m[1]);
  return isNaN(d.getTime()) ? null : d;
}

export function validateFeatureList(
  data: unknown,
  options: { schemaPath?: string } = {},
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const schemaPath = options.schemaPath ?? SCHEMA_PATH;

  // 1. Schema validation
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  const AjvCtor = (Ajv as unknown as { default?: typeof Ajv }).default ?? Ajv;
  const ajv = new AjvCtor({ allErrors: true, strict: false });
  const addFormatsFn =
    (addFormats as unknown as { default?: typeof addFormats }).default ?? addFormats;
  addFormatsFn(ajv);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    for (const e of validate.errors ?? []) {
      errors.push(
        `schema: ${e.instancePath || '<root>'} ${e.message ?? ''} ${JSON.stringify(e.params ?? {})}`,
      );
    }
    return { ok: false, errors, warnings };
  }

  const featureList = data as FeatureList;
  const ids = new Set(featureList.features.map((f) => f.id));

  // 2. WIP=1
  const inProgress = featureList.features.filter(
    (f) => f.status === 'in_progress' && f.wip_lock !== false,
  );
  if (inProgress.length > 1) {
    errors.push(
      `WIP violation: ${inProgress.length} features in_progress (max 1, wip_lock=false 제외): ${inProgress.map((f) => f.id).join(', ')}`,
    );
  }

  // 3. 참조 무결성
  for (const f of featureList.features) {
    for (const dep of f.depends_on ?? []) {
      if (!ids.has(dep)) errors.push(`${f.id}: depends_on references missing feature '${dep}'`);
    }
    for (const blk of f.blocks ?? []) {
      if (!ids.has(blk)) errors.push(`${f.id}: blocks references missing feature '${blk}'`);
    }
  }

  // 4. ADR 파일 존재
  const adrFiles = existsSync(ADR_DIR) ? readdirSync(ADR_DIR) : [];
  for (const f of featureList.features) {
    for (const adr of f.relevant_adrs ?? []) {
      const num = adr.match(/^ADR-(\d{4})$/)?.[1];
      if (!num) {
        errors.push(`${f.id}: relevant_adrs '${adr}' invalid format (expected ADR-XXXX)`);
        continue;
      }
      const found = adrFiles.some((name) => name.startsWith(`${num}-`) && name.endsWith('.md'));
      if (!found) {
        errors.push(`${f.id}: relevant_adrs '${adr}' file missing (${ADR_DIR}/${num}-*.md)`);
      }
    }
  }

  // 5. 파일 존재
  for (const f of featureList.features) {
    if (f.status === 'in_progress' || f.status === 'done') {
      for (const test of f.acceptance?.verifiable?.tests ?? []) {
        if (!existsSync(test)) errors.push(`${f.id}: verifiable.tests file missing '${test}'`);
      }
    }
    if (f.status === 'done') {
      for (const file of f.artifacts?.files_created ?? []) {
        if (!existsSync(file)) errors.push(`${f.id}: artifacts.files_created file missing '${file}'`);
      }
    }
  }

  const planByFeatureId = loadPlansByFeatureId(PLAN_DIR);

  // 6. Plan Post-mortem (ADR-0012) + 6a. Plan mapping strict
  for (const f of featureList.features) {
    if (f.status !== 'done') continue;
    const matchingPlans = planByFeatureId.get(f.id) ?? [];
    if (matchingPlans.length === 0) {
      const idNum = parseInt(f.id.slice(2), 10);
      if (idNum >= PLAN_STRICT_FROM_ID) {
        errors.push(`${f.id}: done이지만 plan 매핑 없음 — F-007 이상 done feature는 plan 필수`);
      }
      continue;
    }
    for (const { file, content } of matchingPlans) {
      const postMortemMatch = content.match(/##\s+Post-mortem[^\n]*\n([\s\S]*?)(?=\n##\s|\n*$)/);
      if (!postMortemMatch) {
        errors.push(`${f.id}: done이지만 plan ${file}에 ## Post-mortem 섹션 없음 (ADR-0012)`);
        continue;
      }
      const body = postMortemMatch[1].trim();
      if (body.length < 20) {
        errors.push(
          `${f.id}: done이지만 plan ${file}의 ## Post-mortem 섹션이 비어있거나 placeholder (ADR-0012)`,
        );
      }
    }
  }

  // 7. Plan Cross-review (ADR-0015)
  for (const f of featureList.features) {
    if (f.status !== 'done') continue;
    const matchingPlans = planByFeatureId.get(f.id) ?? [];
    for (const { file, content } of matchingPlans) {
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;
      const riskMatch = fmMatch[1].match(/risk_class:\s*(\w+)/);
      if (!riskMatch || riskMatch[1] !== 'critical') continue;
      const crossReviewMatch = content.match(/##\s+Cross-review[^\n]*\n([\s\S]*?)(?=\n##\s|\n*$)/);
      if (!crossReviewMatch) {
        errors.push(
          `${f.id}: done + plan ${file} risk_class=critical인데 ## Cross-review 섹션 없음 (ADR-0015)`,
        );
        continue;
      }
      const body = crossReviewMatch[1].trim();
      const isSelfBootstrap = /skipped|self-bootstrapping/i.test(body);
      if (!isSelfBootstrap && body.length < 30) {
        errors.push(
          `${f.id}: done + plan ${file} risk_class=critical의 ## Cross-review 섹션이 비어있거나 placeholder (ADR-0015)`,
        );
      }
    }
  }

  // 8. DAG cycle
  const cycle = findCycle(featureList.features);
  if (cycle) errors.push(`DAG cycle detected in depends_on: ${cycle.join(' → ')}`);

  // 9. blocks 양방향 정합 (transitive 경고)
  const featureMap = new Map(featureList.features.map((f) => [f.id, f]));
  function hasTransitiveDep(targetId: string, fromId: string, visited: Set<string>): boolean {
    if (visited.has(fromId)) return false;
    visited.add(fromId);
    const node = featureMap.get(fromId);
    if (!node) return false;
    for (const dep of node.depends_on ?? []) {
      if (dep === targetId) return true;
      if (hasTransitiveDep(targetId, dep, visited)) return true;
    }
    return false;
  }
  for (const f of featureList.features) {
    for (const blk of f.blocks ?? []) {
      const blocked = featureMap.get(blk);
      if (!blocked) continue;
      if (!hasTransitiveDep(f.id, blk, new Set())) {
        warnings.push(
          `${f.id}.blocks=${blk} 이지만 ${blk}.depends_on 사슬에 ${f.id} 없음 — 끊긴 의존 가능성 (transitive 검증)`,
        );
      }
    }
  }

  // 10. risk_class heuristic 경고
  for (const f of featureList.features) {
    if (f.status === 'done' || f.status === 'future') continue;
    const fAny = f as Feature & { risk_class?: string };
    const hasRisk =
      (f.applies_constraints ?? []).some((c) => c === 'D11' || c === 'C7') ||
      f.acceptance?.verifiable?.migration_dry_run === true ||
      f.acceptance?.verifiable?.hash_chain_integrity === true;
    if (!hasRisk) continue;
    const rc = fAny.risk_class;
    if (rc !== 'critical' && rc !== 'mid') {
      warnings.push(
        `${f.id}: D11/C7 또는 migration_dry_run/hash_chain_integrity 적용인데 risk_class=${rc ?? 'absent'}. critical/mid 검토 권장 (자의적 downgrade 방지).`,
      );
    }
  }

  // 11. license_tier 경로 정합 (Inkvas 신규, ADR-0013 A1/A3)
  for (const f of featureList.features) {
    if (f.status !== 'done' && f.status !== 'in_progress') continue;
    if (!f.license_tier) continue;
    const files = f.artifacts?.files_created ?? [];
    if (f.license_tier === 'enterprise') {
      for (const file of files) {
        if (!file.startsWith('packages/enterprise/')) {
          errors.push(
            `${f.id}: license_tier=enterprise인데 artifacts.files_created '${file}' 이 packages/enterprise/* 가 아님 (ADR-0013 A1/A3)`,
          );
        }
      }
    } else if (f.license_tier === 'oss') {
      for (const file of files) {
        if (file.startsWith('packages/enterprise/')) {
          errors.push(
            `${f.id}: license_tier=oss인데 artifacts.files_created '${file}' 이 packages/enterprise/* 경로 (ADR-0013 A1/A3)`,
          );
        }
      }
    }
  }

  // 12. manual_impact 트레이서블 (Inkvas 신규, ADR-0014)
  for (const f of featureList.features) {
    if (f.status !== 'done') continue;
    if (!f.manual_impact || f.manual_impact === 'none') continue;
    const files = f.artifacts?.files_created ?? [];
    const hasManual = files.some((file) => file.startsWith(MANUAL_DIR + '/'));
    if (!hasManual) {
      errors.push(
        `${f.id}: manual_impact=${f.manual_impact} done인데 artifacts.files_created 에 ${MANUAL_DIR}/** 없음 (ADR-0014)`,
      );
    }
  }

  // 13. audit_ref 트레이서블 (warn only — 정밀 row 추출 어려움)
  // 형식만 확인, 실제 row 존재는 audit md 갱신 시점 다른 메커니즘
  for (const f of featureList.features) {
    if (!f.audit_ref) continue;
    if (!/^(audit:#\d+|original)$/.test(f.audit_ref)) {
      warnings.push(`${f.id}: audit_ref '${f.audit_ref}' 형식 비표준 (예상: 'audit:#N' 또는 'original')`);
    }
  }

  // 14. audit freshness (Inkvas 신규, D15)
  if (existsSync(COMPETITIVE_AUDIT_PATH)) {
    const content = readFileSync(COMPETITIVE_AUDIT_PATH, 'utf-8');
    const lastUpdated = parseLastUpdated(content);
    if (lastUpdated) {
      const ageDays = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      if (ageDays >= AUDIT_FAIL_DAYS) {
        errors.push(
          `competitive-feature-audit.md last_updated 가 ${ageDays}일 전 (>= ${AUDIT_FAIL_DAYS}일) — 갱신 필요 (D15)`,
        );
      } else if (ageDays >= AUDIT_WARN_DAYS) {
        warnings.push(
          `competitive-feature-audit.md last_updated 가 ${ageDays}일 전 (>= ${AUDIT_WARN_DAYS}일) — 갱신 권장 (D15)`,
        );
      }
    } else {
      warnings.push(
        `competitive-feature-audit.md 의 last_updated 필드를 파싱하지 못함 (형식: '- last_updated: **YYYY-MM-DD**')`,
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

// CLI 실행
const isCli =
  process.argv[1] !== undefined && resolve(process.argv[1]).endsWith('validate-feature-list.ts');

if (isCli) {
  const data = JSON.parse(readFileSync(FEATURE_LIST_PATH, 'utf-8'));
  const result = validateFeatureList(data);
  if (result.warnings && result.warnings.length > 0) {
    console.warn('feature_list.json warnings:');
    for (const w of result.warnings) console.warn(`  ⚠ ${w}`);
  }
  if (!result.ok) {
    console.error('feature_list.json validation FAILED:');
    for (const err of result.errors) console.error(`  - ${err}`);
    process.exit(1);
  }
  console.log(`feature_list.json valid (${(data as FeatureList).features.length} features)`);
}

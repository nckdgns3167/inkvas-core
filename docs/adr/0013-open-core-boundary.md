# ADR-0013: Open-core 경계 — Plugin contract + capability registry + ESLint boundaries + 빌드 단독 검증

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: A1 (Apache-2.0 invariance), A3 (license-boundary 트레이서블)
- Related ADRs: ADR-0001 (레포 토폴로지 — 분리 2 레포 기반), ADR-0019 (RBAC — custom role plugin), ADR-0017 (위변조 — PKI/HSM plugin)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §"솔루션화 컨설팅 (2) Open-core 경계 사전 설정" — *Phase 3 코드 시작 전 반드시 박힘*

> bootstrap.md 명시: *"ADR-0013 을 Phase 2 안에 박는다 — Phase 3 코드 시작 전. 원칙: 단일 사용자 가치 = OSS / 조직 운영·감사·규제 = Enterprise."*
>
> 상위 입력: ADR-0001 (B 토폴로지), `docs/business/license-boundary.md` (Phase 0 4축 분류표).

## Context

OSS core ↔ Enterprise 분리는 *코드 차원* 에서 다음 5 게이트 통과 필수:

1. **물리적 격리** — 두 레포 git 히스토리 분리 (ADR-0001 통과)
2. **라이선스 분리** — Apache-2.0 ↔ commercial dual (ADR-0001 통과)
3. **Import 경계** — `packages/core/*` 가 `packages/enterprise/*` import 시 빌드 실패 (본 ADR)
4. **빌드 단독** — `pnpm build:oss` 가 enterprise 0 의존 100% 동작 (본 ADR)
5. **상용 라이선스 키 검증조차 OSS 안에 두지 말 것** — CLA fork 회피 (본 ADR)

## Decision

**Plugin contract (`Plugin<T>` interface + `register(plugin)` + capability registry) + ESLint `boundaries` 룰 + `pnpm build:oss` 검증 CI + 빌드 시 enterprise 0 의존 강제**.

### 1. Plugin contract — OSS 측 (`@inkvas/core`)

```ts
// packages/core/src/plugin/contract.ts
export type Capability =
  | 'signing'           // PKI 서명 (ADR-0017)
  | 'sso'               // SSO/SAML/LDAP (ADR-0019)
  | 'redaction-certified'
  | 'audit-dashboard'
  | 'blockchain-anchor'
  | 'custom-role'
  | 'air-gap';

export interface Plugin {
  name: string;
  capability: Capability;
  version: string;
  // Lifecycle
  init(ctx: PluginContext): void | Promise<void>;
  dispose?(): void | Promise<void>;
}

export interface PluginContext {
  doc: Y.Doc;
  auditLog: AuditChain;
  permissions: PermissionRegistry;
  // ... 모든 *공개* internal API
}

export class CapabilityRegistry {
  private plugins = new Map<Capability, Plugin[]>();

  register(plugin: Plugin): void { /* ... */ }
  get(cap: Capability): Plugin[] { /* ... */ }
  has(cap: Capability): boolean { /* ... */ }
}

// 호스트가 사용
export function register(plugin: Plugin): void {
  globalRegistry.register(plugin);
}
```

OSS 코어는 `Plugin<T>` interface 정의 + `register()` 함수만 export. **구현 0**.

### 2. Plugin 등록 — Enterprise 측 (`@inkvas-enterprise/*`)

```ts
// packages/enterprise/chain/src/index.ts (별도 레포)
import { register, type Plugin } from '@inkvas/core';

export const signingPlugin: Plugin = {
  name: 'inkvas-enterprise-signing',
  capability: 'signing',
  version: '0.1.0',
  async init(ctx) {
    ctx.auditLog.on('appended', async (entries) => {
      const chunk = await signChunk(entries, /* HSM key */);
      ctx.auditLog.appendChunk(chunk);
    });
  },
};

register(signingPlugin);
```

호스트 측은 *Enterprise 빌드 시* `@inkvas-enterprise/*` package 들을 import 후 plugin register. **OSS 빌드 시 enterprise import 없음 = plugin 등록 0**.

### 3. Runtime capability check (코어 측)

```ts
// packages/core/src/integrity/sign-if-available.ts
function trySignChunk(entries: AuditEntry[]) {
  if (capabilityRegistry.has('signing')) {
    // Enterprise plugin 이 등록되어 있으면 자동 처리
    return;  // event hook 에서 처리
  }
  // OSS 빌드 — Layer 1 (hash chain) 만으로 충분
}
```

OSS 빌드 시 `capabilityRegistry.has('signing')` = `false` → no-op. Enterprise 빌드 시 plugin event hook 자동 발화.

### 4. ESLint `boundaries` 룰 (OSS 레포 측)

```json
// inkvas-core/.eslintrc.json
{
  "plugins": ["boundaries"],
  "settings": {
    "boundaries/elements": [
      { "type": "core", "pattern": "packages/core/**" },
      { "type": "host", "pattern": "packages/host-*/**" },
      { "type": "scripts", "pattern": "scripts/**" }
    ]
  },
  "rules": {
    "boundaries/element-types": ["error", {
      "default": "disallow",
      "rules": [
        { "from": "core", "allow": ["core"] },
        { "from": "host", "allow": ["core", "host"] },
        { "from": "scripts", "allow": ["scripts"] }
      ]
    }],
    "no-restricted-imports": ["error", {
      "patterns": ["@inkvas-enterprise/*"]
    }]
  }
}
```

OSS 레포 안에서 `@inkvas-enterprise/*` import 시도 시 ESLint error. `init.sh` step [5/9] lint 가 차단.

### 5. `pnpm build:oss` 검증

```jsonc
// packages/core/package.json (workspace root)
{
  "scripts": {
    "build:oss": "pnpm -r --filter '@inkvas/*' build && node scripts/verify-oss-only.ts"
  }
}
```

`scripts/verify-oss-only.ts` (Phase 3+ 박힘):
- 빌드된 `packages/*/dist/*.js` 를 스캔
- `@inkvas-enterprise/*` 또는 `enterprise` 키워드 포함 시 fail
- 모든 entry point 가 enterprise 없이 import 가능 검증

### 6. 상용 라이선스 키 검증조차 OSS 에 두지 말 것 (CLA fork 회피)

```ts
// packages/core — *없음* (OSS 안에 라이선스 키 검증 코드 X)

// packages/enterprise/license/src/check.ts (Enterprise 레포)
export const licensePlugin: Plugin = {
  name: 'inkvas-enterprise-license',
  capability: 'license',  // 'license' capability 등록
  init(ctx) {
    if (!verifyLicense()) {
      throw new Error('Enterprise license invalid');
    }
  },
};
```

OSS 사용자는 *라이선스 검증 코드 자체를 보지 않음*. Enterprise fork 가 *라이선스 우회* 패치를 하려 해도 *그 코드가 OSS 에 없음* → fork CLA 회피.

### 7. Plugin lazy import (Phase 6+)

Enterprise 빌드 시 모든 plugin 을 *eager import* 하지 않음 — capability 별 lazy:

```ts
// host-react adapter (Enterprise 빌드 시)
const ssoPlugin = await import('@inkvas-enterprise/sso');
register(ssoPlugin.default);
```

Phase 6 본격 구현 시 박힘. Phase 2 의 ADR-0013 은 *원칙* 만 박음.

## Alternatives Considered

### (a) 단일 코드베이스 + 빌드 시점 분기 (`#ifdef ENTERPRISE`)

- Pros: 단일 import 경로
- Cons (결정적): 코드 안에 `if (process.env.ENTERPRISE)` 식 분기 — *OSS 사용자가 enterprise 코드 가시*. A1 위반.

### (b) Trait / 인터페이스 일치 (Plugin contract 없음, type-only)

- Pros: 단순
- Cons: 등록 시점 검증 0 — runtime 의 capability resolution 어려움.

### (c) Plugin contract + capability registry ← **채택**

위 (a)/(b) 의 trade-off — *runtime 등록 + 빌드 시 격리 + lazy import 양립*.

## Consequences

### 직접 박힘

- `packages/core/src/plugin/contract.ts` — Plugin interface + CapabilityRegistry (Phase 3+ 본격)
- `packages/core/.eslintrc.json` — boundaries 룰 (Phase 3 lint 활성 시)
- `scripts/verify-oss-only.ts` — Phase 3+ 박힘
- `init.sh` step [5/9] — boundaries 위반 차단
- AGENTS.md A1/A3 — 본 ADR 의 절차 인용

### Phase 3 G3 전 게이트 (Phase 3 코드 시작 *전* 박힘)

본 ADR 의 *plugin contract 코드* 가 Phase 3 vertical slice *시작 시* 첫 박힘.

### Trade-off

- Plugin contract 의 *over-abstraction* 위험 — Phase 5+ 까지 실 plugin (signing/sso/etc.) 없음. 대응: contract 는 *최소 표면* (init/dispose + capability) 만, 구체 확장은 Phase 6+ supersede.
- Lazy import 의 *Phase 6 학습 부담* — Vite dynamic import 패턴 + workspace pnpm link 결합.

### Risk class

**critical** — 본 ADR 변경은 *모든 packages/* 구조 영향. supersede 시 license-boundary.md + ADR-0001 동시 영향.

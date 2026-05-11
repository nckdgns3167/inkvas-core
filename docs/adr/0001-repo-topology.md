# ADR-0001: 레포 토폴로지 — 분리 2 레포 + 각 레포 내부 pnpm workspace

- Status: **Accepted (2026-05-12)** — 사용자 confirm 완료
- Constraints affected: A1 (Apache-2.0 invariance), A3 (license-boundary 트레이서블)
- Related ADRs: ADR-0000 (프로젝트 정체성), ADR-0013 (Open-core 경계, Phase 2 박힘 예정)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §Phase 0 5번 (토폴로지 결정 ADR-0001 deferred)

> 본 ADR 은 *Phase 0 산출물 (양 GitHub 레포 생성 완료) 이후* + *Phase 1 패키지 매니저 설정 이전* 의 결정 지점. ADR-0013 (Phase 2 Open-core 경계) 의 *상위 입력*.

## Context

bootstrap.md §Phase 1 + §"솔루션화 컨설팅 (2) Open-core 경계 사전 설정" 에서 3 후보 명시:

1. **monorepo + private submodule** — `inkvas-core` 단일 레포에 `packages/enterprise/*` 를 *git submodule* 로 박음.
2. **분리 2 레포** — `inkvas-core` (public) + `inkvas-enterprise` (private) 가 *형제 git 레포*. 각각 독립 빌드·CI.
3. **pnpm workspace** — *단일* git 레포에 `packages/core` + `packages/enterprise/*` + `packages/host-*` 모두 박음 (OSS 측 publish 는 빌드 시 *sparse*).

Phase 0 단계에서 *양 GitHub 레포는 이미 생성됨* (`nckdgns3167/inkvas-core` public + `nckdgns3167/inkvas-enterprise` private). 본 ADR 은 *지금 박힌 상태* 위에서 가장 정합적인 선택을 결정.

원칙 (bootstrap.md §"솔루션화 컨설팅 (2)"):
- 단일 사용자 가치 = OSS / 조직 운영·감사·규제 = Enterprise
- OSS 빌드 100% 단독 동작 보장 — `pnpm build:oss` 시 enterprise 경로 import 시 빌드 *실패* (A1)
- 상용 라이선스 키 검증조차 OSS 안에 두지 말 것 (CLA fork 회피)

## Decision

**(B) 분리 2 레포 + 각 레포 내부 pnpm workspace** 채택.

```
nckdgns3167/inkvas-core  (public, Apache-2.0)        nckdgns3167/inkvas-enterprise  (private, commercial dual)
─────────────────────────────────────────             ────────────────────────────────────────────────────────
inkvas/                                              inkvas-enterprise/
├── package.json (workspace root)                    ├── package.json (workspace root)
├── pnpm-workspace.yaml                              ├── pnpm-workspace.yaml
├── packages/                                        ├── packages/
│   ├── core/        @inkvas/core                    │   ├── sso/        @inkvas-enterprise/sso
│   ├── host-vanilla/ @inkvas/host-vanilla           │   ├── hsm/        @inkvas-enterprise/hsm
│   ├── host-react/  @inkvas/host-react              │   ├── chain/      @inkvas-enterprise/chain
│   └── host-vue/    @inkvas/host-vue                │   ├── redaction/  @inkvas-enterprise/redaction
│                                                    │   └── audit-dash/ @inkvas-enterprise/audit-dashboard
└── ...                                              └── ... (npm dep: @inkvas/core ^x.y.z)
```

### 핵심 규칙

1. **레포 분리는 *git 레벨***: 두 레포는 *별개* git 히스토리. 사용자가 OSS 만 클론하면 enterprise 코드 *물리적으로 안 보임*.
2. **각 레포 내부는 *pnpm workspace***: 코어 + 호스트 어댑터 (또는 SSO + HSM + chain 등) 가 한 workspace 안에서 효율적으로 공유.
3. **Enterprise 가 OSS 를 *npm dependency* 로 소비**: `@inkvas/core` 는 npm 에 publish, Enterprise 패키지가 정상 `dependencies: { "@inkvas/core": "^x.y.z" }` 로 참조. 사일러닝 X.
4. **Plugin contract = OSS 측**: `@inkvas/core` 에 `Plugin<T>` interface + `register(plugin)` 함수 + capability registry. Enterprise 측은 *구현* + `register()` 호출만.
5. **ESLint boundaries**: OSS 빌드 시 `packages/*` 가 *없는 패키지* 를 import 하면 빌드 실패 (단순). Enterprise 빌드 시 `@inkvas/core` import 만 허용.
6. **로컬 dev 시 sibling clone + pnpm link**: 두 레포를 `inkvas/` + `inkvas-enterprise/` 형제 디렉토리로 클론, `pnpm link --global @inkvas/core` 로 dev-time 직접 참조 (선택).
7. **버전 동기**: `@inkvas/core` semver. Enterprise 패키지는 core ^x.y 범위 지정. Breaking 변경 시 core major 올리고 Enterprise 도 같은 시점에 major 올림.

## Alternatives Considered

### (A) Monorepo + private submodule

```
inkvas/  (public)
├── packages/core
└── packages/enterprise/  ← git submodule → inkvas-enterprise (private)
```

**Pros**:
- 단일 git 클론 명령 (`git clone --recurse-submodules`) 으로 dev 환경 완성
- 단일 CI / 단일 ESLint config / 단일 TS config

**Cons (강함)**:
- OSS 컨트리뷰터가 *enterprise 경로의 .gitmodules* 를 보고 혼란. "내가 enterprise 접근 권한 없다 why?" 마찰
- submodule UX 가 *역사적* 으로 어려움 (HEAD detached, push 순서, refs 동기) — 솔로 dev 라도 *AI 에이전트* 가 sumodule 인식 실패 빈번
- OSS 빌드 시 enterprise 경로 *존재 자체* 는 보임 (gitignore 만 안 됨, .gitmodules 가 추적됨) — A1 원칙 *시각적* 위반

### (C) pnpm workspace (단일 레포 + sparse publish)

```
inkvas/  (단일 git 레포, public 으로 동작하되 packages/enterprise/* 만 별도 빌드)
├── packages/core
├── packages/enterprise/  ← 단일 레포 안의 *private* 경로
├── packages/host-*
└── 빌드 시 build:oss 는 packages/enterprise 제외 / build:enterprise 는 모두
```

**Pros**:
- 단일 workspace 의 *최고 DX* — 모든 코드가 한 곳, refactor·rename 일관
- npm dep 동기 부담 0 (workspace 의 자연 link)
- CI 가 한 곳

**Cons (강함)**:
- *git 레포 자체* 가 public 이면 `packages/enterprise/*` 가 OSS 컨트리뷰터에게 *완전 노출* — A1 (Apache-2.0 invariance) 헌법 직접 위반
- *git 레포 자체* 가 private 이면 OSS 컨트리뷰터 접근 불가 — open-core 약속 위반
- *2 git 레포 + git filter-repo 로 OSS subset 만 public 으로 미러* 같은 *고급 자동화* 필요 — 솔로 운영 부담 폭증, 미러 동기 사고 위험
- ESLint boundaries 만으로는 *visibility* 차단 불가 (코드 자체는 누구나 봄)

### 비교 매트릭스

| 기준 | (A) submodule | (B) **2 레포 + 내부 workspace** | (C) pnpm workspace |
|---|---|---|---|
| OSS 코드 visibility 격리 (A1) | △ (.gitmodules 노출) | **◯** | ✕ (단일 레포 노출) |
| Dev DX (refactor·rename) | △ | △ (cross-repo 시 npm dep 사이클) | ◯ (단일 workspace) |
| CI 단순도 | ◯ (단일) | △ (2 CI) | ◯ (단일) |
| AI 에이전트 친화 | △ (submodule trip) | **◯** (각 레포 self-contained) | ◯ |
| 솔로 운영 부담 | △ | **◯** | △ (mirror 자동화 부담) |
| Phase 0 *기 박힌 상태* 정합 | ✕ (재구성 필요) | **◯** (이미 정합) | ✕ (재구성 필요) |
| OSS 컨트리뷰터 진입 마찰 | △ | **◯** | ✕ (private 코드 보임) |

**(B) 가 7/7 기준 중 4승 + 3 동률. (A) 와 (C) 는 *visibility* 또는 *재구성 비용* 에서 결정적 약점.**

## Consequences

### 직접 박힘

- `inkvas-core` repo: pnpm workspace 활성 + `packages/{core,host-vanilla,host-react,host-vue}` 디렉토리 scaffold (Phase 3+ 채워짐). 본 ADR confirm 직후 *Phase 1 후반부* 에 package.json + pnpm-workspace.yaml + tsconfig.json + base ESLint config 박힘.
- `inkvas-enterprise` repo: 동일 패턴, 단 `packages/{sso,hsm,chain,redaction,audit-dashboard}` 디렉토리 (Phase 6+ 채워짐). Phase 1 종료 시점에는 placeholder README + pnpm-workspace.yaml + LICENSE 정도만.
- `@inkvas/core` 는 Phase 5 (협업 P/G5) 즈음 *npm 첫 publish*. 그 전까지는 Enterprise 측이 *file:* 또는 *workspace:* 참조 (사용자가 두 레포 sibling clone 시).

### Plugin contract 명시 위치

- `@inkvas/core/src/plugin/contract.ts` — `Plugin<T>`, `Capability`, `register(plugin)` 인터페이스.
- `@inkvas/core/src/plugin/registry.ts` — runtime registry. OSS 빌드 시 항상 *빈 상태*. Enterprise 가 dynamic import 후 `register()` 호출.

### ESLint boundaries 룰 (Phase 2 ADR-0013 + 본 ADR derive)

```js
// .eslintrc — inkvas-core 레포 측
{
  "plugins": ["boundaries"],
  "rules": {
    "boundaries/no-unknown": "error",
    "boundaries/element-types": ["error", {
      "default": "disallow",
      "rules": [
        { "from": "core", "allow": ["core"] },
        { "from": "host", "allow": ["core", "host"] }
      ]
    }]
  }
}
```

```js
// .eslintrc — inkvas-enterprise 레포 측
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": ["@inkvas-enterprise/internal-*"]   // 다른 enterprise 패키지의 내부 모듈 직접 import 차단
    }]
  }
}
```

### 후속 의사결정 트래커

| # | 액션 | 시점 | 책임 |
|---|---|---|---|
| T1 | `inkvas-core` 의 `pnpm-workspace.yaml` + `package.json` (workspace root) 박힘 | Phase 1 후반 (본 ADR confirm 직후) | Claude |
| T2 | `inkvas-enterprise` 의 동일 scaffold push | Phase 1 후반 | Claude |
| T3 | `@inkvas/core` 첫 npm publish (v0.1.0-alpha) | Phase 3 통과 시 | Claude + 사용자 npm token |
| T4 | Enterprise 의 `dependencies: { "@inkvas/core": "..." }` 활성 | Phase 6 진입 | Claude |
| T5 | 본 ADR supersede 트리거 — Enterprise 가 OSS 와 *너무 자주 동기 깨짐* 발견 시 (예: 분기 3회 이상 major bump) → (C) pnpm workspace 재검토 | Phase 6+ | 사용자 + Claude |

### 본 ADR 의 트레이서블 의무

- ADR-0013 (Open-core 경계, Phase 2 작성) 은 본 ADR 을 *전제로 박힘* — 본 ADR 변경 시 ADR-0013 동시 supersede 필요.
- `docs/business/license-boundary.md` 의 §2 "기능별 분류표" 가 본 ADR 의 레포 분리에 *물리적으로 매핑*. license-boundary 갱신 시 본 ADR 영향 확인.
- `inkvas-enterprise` 측의 ADR 시퀀스는 *별개 시퀀스* 가 아닌 *동일 시퀀스* (ADR 번호 충돌 회피). Enterprise 레포의 ADR 작성 시 본 레포의 ADR 인덱스 참조.

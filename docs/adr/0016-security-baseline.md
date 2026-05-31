# ADR-0016: Security Baseline — SBOM (CycloneDX) + signed builds (Sigstore) + CVE 모니터링 + 망분리 호환

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: P6-2 (망분리 빌드), C9 (시크릿 zod)
- Related ADRs: ADR-0017 (위변조 — 솔루션 측 보안), ADR-0013 (Open-core 경계 — Enterprise plugin 보안)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §"솔루션화 컨설팅 (3) B2B/B2G 진입 *킬 위협*" → "보안 인증 (ISMS-P, GS 1등급, CC) — Phase 7, 3000만원+"

> bootstrap.md 명시: *"B2G 필수"*. Phase 7 보안 인증 (ISMS-P / GS 1등급 / CC) 트랙의 *baseline* 박는 본 ADR.

## Context

B2B/B2G 진입의 *보안 요구* 분류:

| 영역 | 요구 |
|---|---|
| 의존성 가시성 | **SBOM** (Software Bill of Materials) — CycloneDX 또는 SPDX. RFP 응답서 필수 항목. |
| 빌드 신뢰성 | **Signed builds** — 빌드 산출물 위변조 차단. Sigstore (cosign + Fulcio + Rekor) 가 OSS 표준. |
| CVE 대응 | **취약점 모니터링** — Dependabot / Snyk / Renovate. 24시간 내 critical CVE patch. |
| 망분리 | **Air-gap 빌드** — 외부 의존 0 패키지 (P6-2, Phase 7). |
| 시크릿 관리 | **시크릿 zod** (C9) + gitleaks pre-commit + 별도 secret store (Phase 6+) |
| 컴플라이언스 | ISMS-P / GS 1등급 / Common Criteria (Phase 7) |

## Decision

**SBOM CycloneDX + Sigstore signed builds + Dependabot/Snyk + gitleaks pre-commit + air-gap 빌드 검증 (Phase 7)**.

### 1. SBOM (CycloneDX)

```yaml
# .github/workflows/sbom.yml (Phase 5+)
name: sbom
on:
  push:
    tags: ['v*']
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm cyclonedx-bom -o sbom.cdx.json
      - uses: actions/upload-artifact@v4
        with: { name: sbom, path: sbom.cdx.json }
```

릴리스 마다 SBOM 자동 생성. RFP 응답서 첨부 (`docs/compliance/sbom/`).

### 2. Signed builds (Sigstore)

```yaml
# .github/workflows/release.yml
- run: pnpm build
- run: cosign sign-blob --yes packages/core/dist/index.js
- run: cosign attest --yes --predicate sbom.cdx.json --type cyclonedx packages/core/dist/index.js
```

- `cosign sign-blob` — 빌드 산출물 *서명* (keyless, Fulcio CA)
- `cosign attest` — SBOM 을 *서명된 attestation* 으로 첨부
- Rekor 공개 ledger 에 자동 기록 — 변조 시 즉시 감지

### 3. CVE 모니터링

- **GitHub Dependabot** — package.json deps 의 CVE 알림 + 자동 PR
- **Snyk** (선택) — 더 정밀한 CVE DB + 컨테이너 스캔 (Phase 7 air-gap 빌드 시)
- **Renovate** — 의존성 일괄 업데이트 (Dependabot 와 양자택일 가능)
- *Critical CVE patch 24시간 내* — feature_list 의 `wip_lock: false` 메타 작업으로 즉시 처리

### 4. 시크릿 관리 (C9 확장)

```bash
# .husky/pre-commit
gitleaks protect --staged
```

`gitleaks` (또는 `secretlint`) 가 *staged diff* 안 시크릿 패턴 (`AKIA*`, `sk_live_*`, `ghp_*` 등) 검출 시 commit 차단.

Phase 6+ 의 *Enterprise license keys* 는 *별도 secret store* (HashiCorp Vault / AWS Secrets Manager / Azure Key Vault) — 코드 안 평문 0.

### 5. 망분리 빌드 (P6-2, Phase 7)

```bash
# 망분리 환경 빌드 시나리오
# 1. 외부 환경에서 의존성 prefetch
pnpm install --frozen-lockfile
pnpm pack-deps  # node_modules + cached registry → offline-bundle.tar.gz

# 2. 망분리 환경 (외부 접속 0)
tar xf offline-bundle.tar.gz
pnpm install --offline   # 외부 fetch 0, 모든 의존이 prefetched
pnpm build               # 빌드
```

검증:
- `npm config get registry` 가 *localhost mirror* 로 박힘
- `pnpm install --offline` 0 fetch 통과
- Phase 7 진입 시 *별도 plan* (망분리 빌드 가이드 + reference 도입 사이트 시뮬레이션)

### 6. 의존성 정책

- *pinned semver* — `^x.y.z` 사용. 정확한 lockfile (`pnpm-lock.yaml`) 으로 reproducibility.
- *Apache-2.0 호환 라이선스 만* (`pnpm licenses list` 검증, Phase 5+ CI 추가)
- *Mozilla pdf.js* (Apache-2.0), *lit* (BSD-3-Clause + Apache 호환), *yjs* (MIT) — 모두 OSS 코어 호환

### 7. 컴플라이언스 트랙 (Phase 7)

| 인증 | 시점 | 부담 |
|---|---|---|
| **ISMS-P** (한국) | Phase 7 진입 | 신청비 + 컨설팅 ~3000만원, 6~12개월 |
| **GS 1등급** (한국 SW 품질) | Phase 7 진입 | 신청비 ~1500만원, 3~6개월 |
| **WA 마크** (한국 웹접근성) | Phase 7 진입 | 신청비 ~300만원, 1~2개월 |
| **Common Criteria** (국제) | Phase 7+ (필요 시) | 신청비 1억원+, 12~24개월 |

ISMS-P 가 최우선 — *한국 공공 RFP* 표준 요구.

## Alternatives Considered

### (a) Security baseline 없음 (Phase 7 진입 시 일괄)

- Cons (결정적): Phase 7 진입 시 *모든 코드 재검토* 부담. 솔로 dev 미감당. **Phase 1 부터 박힘이 시간 분산.**

### (b) 모든 항목 Phase 1 부터 동시 활성

- Cons: 솔로 dev *시간 압박*. 일부 항목 (SBOM, signed builds) 은 *릴리스* 시점에만 의미.

### (c) Phase-staged 활성 ← **채택**

| Phase | 활성 항목 |
|---|---|
| Phase 1 (현재) | gitleaks pre-commit + Dependabot |
| Phase 3 | Lighthouse a11y CI (ADR-0010) |
| Phase 5 | SBOM 자동 생성 + Sigstore signed builds + 라이선스 lint |
| Phase 6 | secret store (HashiCorp Vault 등) + Enterprise plugin signing |
| Phase 7 | Air-gap 빌드 검증 + ISMS-P / GS / WA 인증 트랙 |

## Consequences

### 직접 박힘

- `.husky/pre-commit` — gitleaks (Phase 1 활성 — 일단 placeholder, 정식 Phase 2 husky 도입 시)
- `.github/dependabot.yml` (Phase 1 활성)
- `.github/workflows/sbom.yml` (Phase 5 박힘)
- `.github/workflows/release.yml` (Phase 5 박힘)
- `docs/compliance/` 디렉토리 (Phase 7+ 채워짐 — SBOM 산출물, 인증 응답서)
- AGENTS.md §3 — security baseline 인용

### Phase 매핑

- Phase 1: gitleaks + Dependabot baseline
- Phase 5: SBOM + Sigstore 활성
- Phase 6: secret store + Enterprise signing
- Phase 7: air-gap + ISMS-P / GS / WA 인증

### Trade-off

- Sigstore keyless 서명은 *공개 ledger (Rekor) 에 기록* — 빌드 메타데이터가 공개. OSS 빌드는 문제 없음 (이미 공개). Enterprise 빌드는 *별도 keypair* (Sigstore Cosign with own key).
- ISMS-P 등 인증 비용은 *Phase 7* 비용 — Phase 0~6 까지 *진입 결정* 의 일부.

### Risk class

**mid** — Security baseline 변경은 인프라 영향, 코드 직접 영향 미미.

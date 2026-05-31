# ADR-0014: Manual Freshness Gate — MDX live import + Playwright screenshot diff + init.sh 단

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: D14 (Manual freshness gate)
- Related ADRs: ADR-0002 (Plan-as-Code), ADR-0003 (Lit Web Components — MDX 안에서 live import)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §"솔루션화 컨설팅 (4) 메뉴얼 자동 최신화 메커니즘 — 3단 강제"

> bootstrap.md 명시 3단 강제:
> 1. **`feature_list.schema.json` 에 `manual_impact` 필드 필수** — `"none"` 외 값인데 PR 에 `docs/manual/**` 변경 없으면 merge 차단
> 2. **MDX 기반 `docs/manual/`** — Storybook 도입 회피. 각 chapter 가 *진짜 컴포넌트 import* 해서 live 렌더
> 3. **Playwright screenshot 자동화** — manual MDX 의 `<Screenshot story="..." />` 컴포넌트 스캔 → `public/manual/img/*` 갱신. `init.sh` `manual-freshness` 단계가 3일 이상 된 hash mismatch 시 fail

본 ADR 은 위 3 단의 *구현 사양*.

## Context

"기능은 짰는데 매뉴얼이 6개월 뒤처짐" 사고는 *솔루션화 단계* 의 *결정적 실패 패턴*:
- B2B/B2G 고객사는 매뉴얼이 *최신* 임을 요구 (보안성 검토 응답서, RFP)
- 매뉴얼이 옛 UI 스크린샷을 가리키면 *영업 마찰* 직접 발생
- 솔로 + AI 환경에서 메뉴얼 자동 갱신 *없이* 직접 작성은 *시간 압박 시 우선 생략*

대응: *Post-mortem 강제 (ADR-0012) 와 동등한 무게의 메뉴얼 게이트*.

## Decision

**3단 강제 + MDX live import + Playwright screenshot diff + init.sh manual-freshness 단**.

### 1. `manual_impact` 필드 (이미 ADR-0002 + feature_list.schema.json 박힘)

```json
{
  "manual_impact": "none" | "section" | "new-chapter"
}
```

`validate-feature-list.ts` cross-validation 12: done feature 의 manual_impact ≠ "none" 인데 artifacts.files_created 에 `docs/manual/**` 없으면 error → init.sh fail (이미 박힘).

### 2. MDX 기반 `docs/manual/`

```mdx
<!-- docs/manual/02-keyboard-shortcuts.mdx -->
import { Screenshot } from '../components/Screenshot';
import { InkvasViewer } from '@inkvas/core';

# Keyboard Shortcuts

PDF annotation 도구의 단축키 전체.

## 도구 선택

펜 (`P`), 형광펜 (`H`), 지우개 (`E`), 텍스트 (`T`).

<Screenshot story="toolbar-default" caption="기본 툴바" />

## 실제 컴포넌트 사용

<InkvasViewer
  pdfSrc="/sample.pdf"
  readOnly={true}
  style={{ height: '400px' }}
/>
```

- Storybook *미도입* — 컴포넌트는 *진짜 컴포넌트* (`@inkvas/core`) 를 import. Storybook 의 별도 mock context 부담 회피.
- `<Screenshot story="..." />` 가 *Playwright 자동 스크린샷* 의 anchor.

### 3. Playwright screenshot 자동화

```ts
// scripts/manual-screenshot.ts (Phase 3+ 박힘)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { createHash } from 'crypto';

async function generateScreenshots() {
  const mdxFiles = readdirSync('docs/manual').filter(f => f.endsWith('.mdx'));
  for (const file of mdxFiles) {
    const content = readFileSync(`docs/manual/${file}`, 'utf-8');
    const stories = [...content.matchAll(/<Screenshot story="([^"]+)"/g)].map(m => m[1]);
    for (const story of stories) {
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.goto(`http://localhost:3000/storybook/${story}`);
      const screenshot = await page.screenshot({ fullPage: true });
      const hash = createHash('sha256').update(screenshot).digest('hex').slice(0, 8);
      const path = `public/manual/img/${story}-${hash}.png`;
      writeFileSync(path, screenshot);
      // hash registry 갱신: `public/manual/img/_index.json`
    }
  }
}
```

### 4. `init.sh` manual-freshness 단

```bash
# init.sh step [8/9]
echo "[8/9] manual freshness (D14, ADR-0014)"
pnpm test:manual-freshness
```

`pnpm test:manual-freshness` 는:
- 모든 `docs/manual/*.mdx` 의 `<Screenshot story="..." />` 스캔
- `public/manual/img/_index.json` 의 hash 와 현재 컴포넌트 렌더 hash 비교
- *3일 이상* hash mismatch 시 fail
- AI 또는 사용자에게 *갱신 요청* 메시지 표시

### 5. CI 워크플로

```yaml
# .github/workflows/manual.yml
name: manual-freshness
on:
  pull_request:
    paths:
      - 'packages/core/src/**'
      - 'docs/manual/**'
jobs:
  freshness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm dev:storybook &       # 임시 서버 (Phase 4+ 박힘)
      - run: pnpm test:manual-freshness
      - if: failure()
        run: echo "::error::Manual screenshots out of date. Run 'pnpm manual:regenerate'."
```

### 6. 메뉴얼 사이트 (Phase 7+)

- 빌드된 MDX → 정적 사이트 (`docs.inkvas.app`) 배포
- Phase 7 솔루션화 단계 — *영업 자료* 와 통합

## Alternatives Considered

### (a) 매뉴얼 수동 갱신 (게이트 없음)

- Cons (결정적): 시간 압박 시 항상 생략. *6개월 뒤처짐* 사고 직접 재발.

### (b) Storybook + Chromatic (visual diff SaaS)

- Pros: 검증된 visual diff
- Cons: Storybook 의 별도 mock context 부담 + Chromatic 비용 (SaaS) + air-gap 호환 X (Phase 7).

### (c) MDX live + Playwright + init.sh ← **채택**

- Storybook 회피 (별도 mock 부담 0)
- Playwright = 이미 e2e 도구로 채택
- init.sh 통합 — 솔로 dev 의 *기계적 게이트*

## Consequences

### 직접 박힘 (Phase 3+ 본격)

- `docs/manual/` 디렉토리 + 첫 chapter `01-quickstart.mdx` (Phase 3 G3 시점)
- `scripts/manual-screenshot.ts` (Phase 3+)
- `init.sh` step [8/9] `manual-freshness` 활성 (Phase 3+)
- `validate-feature-list.ts` cross-validation 12 (이미 박힘, Phase 1)
- `.github/workflows/manual.yml` (Phase 4+)
- `docs/manual/components/Screenshot.tsx` (Phase 3+)

### Phase 매핑

- **Phase 3** — 첫 manual chapter `01-quickstart.mdx` + screenshot 자동화 baseline
- **Phase 4** — 어노 도구 chapter (Screenshot 도구별)
- **Phase 7** — `docs.inkvas.app` 정적 사이트 배포

### Trade-off

- Phase 3+ 까지 *MDX live render* 인프라 구축 부담 — Vite + MDX plugin + Lit 통합. AI 에이전트 boost 가능.
- Playwright screenshot 의 *환경 의존* — CI 환경의 렌더가 로컬 환경과 미세 차이 → flaky 가능. 대응: hash 비교에 *허용 오차* (perceptual diff, e.g., pixelmatch) 적용.

### Risk class

**critical** — 메뉴얼 게이트는 *솔로 솔루션화* 의 직접 안전망. 변경 시 D14 의 강제력 잃음.

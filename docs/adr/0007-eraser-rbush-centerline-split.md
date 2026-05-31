# ADR-0007: Eraser Algorithm — RBush bbox + centerline split (O(log N + M_intersect))

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: B4 (태블릿 60fps), B5 (long-task 0)
- Related ADRs: ADR-0005 (어노 엔진 — entity + spatial index 공유), ADR-0006 (Worker pool — eraser hit-test offload)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §Phase 2 ADR-0007

> 옛 viewer 부채 인용 (`inkvas-legacy-assets/pdf_viewer_svelte/src/lib/tools/eraserMode.svelte.ts`): **eraser O(N²)**. centerline split 알고리즘은 *옳음*, 하지만 *N stroke × M segment 무차별 비교* 가 O(N²M) 폭주. 본 ADR 은 *spatial index 로 N → log N 축소* + *centerline split 은 유지*.

## Context

Eraser 의 두 모드:
1. **Stroke eraser** — 닿은 stroke 전체 삭제 (간단)
2. **Pixel/segment eraser** — stroke 의 *닿은 segment* 만 삭제, 나머지 split (옛 viewer 의 centerline split)

Phase 4 *재현 필수 UX* 요구: 두 모드 모두 지원. *segment eraser* 가 어렵고, *대량 stroke 환경* (1000+) 에서 성능 게이트 (B4/B5) 통과 필수.

옛 viewer 알고리즘 (centerline split):
- 각 stroke 을 N 개의 segment (`[p_i, p_{i+1}]`) 로 분해
- eraser 의 원 (반경 r) 이 segment 와 *교차* 하는지 검사
- 교차 segment 가 있으면 stroke 을 split — *교차 이전* segment 들로 stroke_a, *교차 이후* segment 들로 stroke_b

문제: *모든 stroke* × *모든 segment* 무차별 비교 → O(N×M) per eraser tick. 1000 stroke × 평균 50 segment = 50,000 비교 per tick. 60fps 16ms budget 불가능.

## Decision

**RBush 기반 candidate pruning + centerline split on candidates only**.

### 1. 단계 (per eraser tick)

```
[1] Eraser 의 원 bbox 계산 (간단)
   → query_box = { minX, minY, maxX, maxY }
[2] RBush 쿼리: stroke.bbox 가 query_box 와 *교차* 하는 stroke 만 candidate
   → candidate_strokes = O(log N + K)
   → K = bbox 교차 stroke 수 (1000 stroke 환경에서 보통 K = 1~10)
[3] 각 candidate stroke 의 segment 들에 centerline split
   → 정확한 segment 교차 검사 (CPU 무거운 path 는 candidate 만)
   → 교차 segment 발견 시 stroke 을 split (옛 viewer 알고리즘)
[4] CRDT op 생성:
   - 옛 stroke remove op
   - 새 split stroke_a / stroke_b add op (atomic)
   → hash chain 에 op 의 hash append (C7, ADR-0017)
[5] RBush 갱신: 옛 stroke 의 bbox 제거 + 새 stroke 의 bbox 삽입
```

### 2. 복잡도

- **이전 (옛 viewer)**: O(N × M) per tick — 1000 × 50 = 50,000
- **본 ADR**: O(log N + K × M) per tick — log(1000) + 5 × 50 = ~260
- **개선**: ~200배

### 3. Eraser 양 모드 동시 지원

```ts
type EraserMode = 'stroke' | 'segment';

function eraseAtPoint(p: WorldPoint, radius: number, mode: EraserMode) {
  const candidates = rbush.search(bbox(p, radius));  // O(log N + K)
  if (mode === 'stroke') {
    // 닿은 stroke 전체 remove
    for (const stroke of candidates) {
      if (intersectsAnySegment(stroke, p, radius)) {
        crdt.applyOp({ kind: 'remove', id: stroke.id });
      }
    }
  } else {
    // segment eraser: centerline split
    for (const stroke of candidates) {
      const splits = centerlineSplit(stroke, p, radius);
      if (splits) {
        crdt.applyOp({ kind: 'remove', id: stroke.id });
        for (const newStroke of splits) {
          crdt.applyOp({ kind: 'add', entity: newStroke });
        }
      }
    }
  }
}
```

### 4. Worker offload (ADR-0006)

- `HIT_TEST_ERASER` 작업 종 (high priority)
- 메인 → worker: `{ kind: 'erase', point, radius, mode }`
- worker → 메인: `{ kind: 'erase-result', ops: [remove..., add...] }`
- worker 안에 RBush 인스턴스 + centerline split 알고리즘
- 메인 fast path: 임시 *eraser cursor* (간단 원) 즉시 그리기, worker 결과로 *실제 op 적용*

### 5. 추가 최적화 (Phase 4 perf 게이트 fail 시 도입)

- **Quadtree fallback** — RBush 가 균등 분포 가정. stroke 이 *밀집 영역 + 빈 영역* 비율이 심한 경우 Quadtree 가 더 빠를 수 있음. 본 ADR 의 supersede 트리거.
- **Hit-region bitmap** — 더 빠른 hit-test (constant time) 가능하나 메모리 폭발 (1000x1000 bitmap = 1MB) 위험. B6 부담.

## Alternatives Considered

### (a) Centerline split (옛 viewer 그대로)

- Cons (결정적): O(N×M) 부채 직접 재발. **차단.**

### (b) BVH-tree (Bounding Volume Hierarchy)

- Pros: 3D ray-tracing 분야에서 검증
- Cons: 2D 어노 환경에서 RBush 대비 *implementation 복잡*. 솔로 dev 시간 trade-off 가 RBush 가 유리.

### (c) RBush (R-tree 변형) + centerline split ← **채택**

- Pros: 2D bbox query 의 *표준* 라이브러리, 검증, 작음 (gzip ~7KB), npm 의존
- Pros: ADR-0005 의 spatial index 와 *공유* — eraser 만의 별도 자료구조 없음
- Cons: 균등 분포 가정 — *극단 밀집* 시 BVH/Quadtree 보다 약함 (Phase 4 봐서 supersede 검토)

### (d) Hit-region bitmap (constant time)

- Pros: O(1) hit-test
- Cons (결정적): B6 메모리 부담 (1000x1000 = 1MB, 자유캔버스 4000x4000 = 16MB)

### 비교

| 기준 | (a) Centerline only (옛) | (b) BVH | **(c) RBush (채택)** | (d) Bitmap |
|---|---|---|---|---|
| B4/B5 (1000+ stroke 60fps + long-task 0) | ✕ | ◯ | **◯** | ◯ |
| B6 memory | ◯ | ◯ | **◯** | ✕ |
| 솔로 dev 구현 부담 | ◯ (옛 자산) | △ (복잡) | **◯** (npm 라이브러리) |◯|
| 균등 분포 robustness | - | ◯ | △ | ◯ |
| ADR-0005 spatial index 공유 | ✕ | ✕ | **◯** | ✕ |
| 부채 재발 회피 | ✕ | ◯ | **◯** | ◯ |

→ **(c) RBush + centerline split 채택**. (b)/(d) 는 Phase 4 perf 게이트 fail 시 supersede 트리거.

## Consequences

### 직접 박힘

- `packages/core/package.json`: `rbush` (^4.0) — 이미 ADR-0005 와 공유
- `packages/core/src/annotation/eraser.ts` — `eraseAtPoint(p, radius, mode)` 함수
- `packages/core/src/annotation/centerline-split.ts` — 옛 viewer `eraserMode.svelte.ts` *알고리즘 참조* (A2 legacy 격리, 재작성)
- `packages/core/src/worker/eraser-worker.ts` — ADR-0006 worker pool 활용

### Phase 4 perf 게이트 명시

- **eraser 10k segment <16ms 처리** — 단일 tick 에서 candidate pruning + centerline split 16ms 내 완료
- 측정: `performance.now()` before/after `eraseAtPoint`, p99 < 16ms over 1000 tick

### Trade-off

- RBush 의 균등 분포 가정 — 극단 밀집 영역 (예: 한 페이지에 1000 stroke 빽빽) 에서 candidate K 가 폭증 가능. 대응: Phase 4 측정 후 *최악 시나리오* 가 16ms 초과 시 Quadtree fallback supersede 검토.

### Risk class

**mid** — 알고리즘 supersede 비용은 RBush → Quadtree 한정 (구조 동일, library swap). entity 모델 영향 0.

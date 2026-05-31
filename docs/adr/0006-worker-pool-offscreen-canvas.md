# ADR-0006: Worker Pool + OffscreenCanvas — 메인스레드 long-task 0 + hardwareConcurrency-1 풀

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: B4 (태블릿 60fps), B5 (long-task 0), B6 (memory)
- Related ADRs: ADR-0004 (pdf.js worker — 별도), ADR-0005 (어노 엔진 render pipeline), ADR-0007 (Eraser hit-test), ADR-0017 (hash chain compute), ADR-0018 (태블릿 입력 응답성)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §Phase 2 ADR-0006

> 옛 viewer 부채 인용: *"1000+ stroke 60fps + 태블릿 60fps 미달"*. paper.js 가 메인스레드 직렬화 + 모든 hit-test/render 가 메인 → B4/B5 동시 실패. 본 ADR 이 *근본 차단*.

## Context

ADR-0005 가 *어노 엔진의 render pipeline 을 worker 로 offload* 결정. 본 ADR 은 *worker pool 의 구체 구조* 결정.

옵션 (bootstrap.md):
- **메인스레드만** — 부채 직접 재발
- **Worker only** — 모든 렌더가 worker, UI 응답성과 충돌 가능 (input → render commit 지연)
- **하이브리드 (둘다)** — UI 즉시 응답 (cursor/hover) + 무거운 컴퓨트 (대량 stroke render, hit-test, hash compute) 는 worker

기술 baseline:
- **OffscreenCanvas** (Web Standard) — Worker 에서 canvas 그리기 가능. Chrome 69+, Safari 16.4+, Firefox 105+. Inkvas 지원 브라우저 (Chromium 90+, Safari 14+, Firefox 88+) 와 정합 — Safari 14 는 OffscreenCanvas 미지원 → **Safari 16.4+ 로 minimum 상향 권장**.
- **Worker pool** — N 개 worker 생성, 작업 분배. `navigator.hardwareConcurrency` 로 코어 수 확인.

## Decision

**하이브리드 worker pool — `pool size = max(2, hardwareConcurrency - 1)` + OffscreenCanvas + 메시지 채널 매핑된 작업 분배**.

### 1. Pool 구조

```ts
class WorkerPool {
  workers: Worker[];                    // size = max(2, hardwareConcurrency - 1)
  taskQueue: TaskQueue;                 // priority queue (high: input → render commit, low: background hash)
  capabilityMap: Map<Worker, Set<TaskType>>;  // 각 worker 가 받을 수 있는 작업 종

  // 작업 종 (Inkvas 의 4 종)
  static TASKS = {
    RENDER_STROKES: 'high',          // 어노 stroke render (ADR-0005)
    HIT_TEST_ERASER: 'high',         // eraser RBush + centerline split (ADR-0007)
    HASH_CHAIN_COMPUTE: 'low',       // hash chain append (ADR-0017, C7)
    CRDT_MERGE: 'medium',            // CRDT op merge (ADR-0008)
  };
}
```

- 메인스레드는 *worker 생성 + 메시지 큐 + 결과 합성* 만.
- UI 즉시 응답 (input → 임시 cursor 트레일) 은 *메인스레드 fast path* (worker round-trip 우회) — 다음 frame 에 worker 결과로 *교체* (FLIP 패턴).

### 2. OffscreenCanvas 사용 패턴

```ts
// 메인스레드 — Canvas 를 worker 로 위임
const onscreen = document.querySelector('canvas')!;
const offscreen = onscreen.transferControlToOffscreen();
worker.postMessage({ kind: 'init', offscreen, ... }, [offscreen]);

// Worker 에서
self.onmessage = (e) => {
  if (e.data.kind === 'init') {
    const ctx = e.data.offscreen.getContext('2d');
    // 이후 모든 그리기는 worker 안에서, 메인스레드 차단 0
  }
};
```

각 stroke render 마다 새 canvas 가 아닌, *지정된 worker 에 위임된 단일 offscreen canvas* 에 누적 그리기 + commit.

### 3. 메시지 채널 (구조화 복제 + Transferable)

- 큰 데이터 (Uint8Array, ArrayBuffer, ImageBitmap) 는 *transferable* 로 zero-copy 전달
- entity 객체 (Stroke 등) 는 구조화 복제 (structured clone) — JSON-serializable 보장 (ADR-0005 immutable entity 와 정합)

### 4. SharedArrayBuffer (선택, Phase 5+)

- 매우 큰 작업이력 영속 (USP-5) 의 *공유 메모리* 후보
- COOP/COEP 헤더 필요 (호스트 환경 제약) — Phase 5 에서 결정

### 5. Pool fallback (OffscreenCanvas 미지원 브라우저)

- Safari < 16.4 등 OffscreenCanvas 미지원 시 *메인스레드 fallback* — 1000+ stroke 시 성능 저하 *수용* 하되 *경고 toast* + Lighthouse perf 경고
- 지원 환경 (Chromium 90+ / Safari 16.4+ / Firefox 105+) 가 *권장 minimum*, fallback 은 *영역 외* 사용자에게만

## Alternatives Considered

### (a) 메인스레드만 (옛 viewer)

- Cons (결정적): B4/B5 부채 직접 재발. **차단 항목.**

### (b) Worker only (모든 렌더 offload)

- Pros: 메인스레드 완전 free
- Cons:
  - input → render commit 지연 (worker round-trip ~1-5ms) — 펜 트레일이 *후행* 보임 (사용자 경험 저하)
  - 메인스레드 fast path 가 가능한데 의도적으로 unused — 자원 낭비

### (c) 하이브리드 ← **채택**

- 메인 fast path (즉시 입력 cursor / 임시 트레일)
- Worker 무거운 path (stroke render, hit-test, hash)

### 비교

| 기준 | (a) 메인만 | (b) Worker only | **(c) 하이브리드 (채택)** |
|---|---|---|---|
| B4 태블릿 60fps | ✕ | ◯ | **◯** |
| B5 long-task 0 | ✕ | ◯ | **◯** |
| 입력 응답성 (input lag) | ◯ | △ (round-trip) | **◯** (메인 fast path) |
| OffscreenCanvas 미지원 fallback | ◯ (자동) | △ | **◯** (메인 fallback) |
| 솔로 dev 복잡도 | ◯ | △ (worker only) | △ (둘 다 관리) |

## Consequences

### 직접 박힘

- `packages/core/src/worker/pool.ts` — WorkerPool 클래스
- `packages/core/src/worker/render-worker.ts` — render task worker
- `packages/core/src/worker/hash-worker.ts` — hash chain task worker (ADR-0017)
- `packages/core/src/worker/message-protocol.ts` — 메시지 타입 + Transferable 보호
- Vite 빌드 설정 — `?worker` 패턴으로 worker 정적 import
- 브라우저 지원 minimum 상향: **Safari 16.4+** (OffscreenCanvas 보장)

### Trade-off

- Pool 관리 복잡도 증가 — worker lifecycle, 메시지 큐, 우선순위 분배. AI 에이전트 학습 자료 충분 (Web Worker 표준).
- Safari 14~16.3 지원 포기 — *Phase 7 솔루션화 시* 영업 제약 가능. 대응: 메인스레드 fallback 으로 degraded mode 제공.

### Phase 4 Perf 게이트 명시

- 1000+ stroke render 60fps (PC + 태블릿) — worker pool 통과
- eraser 10k segment <16ms — worker hit-test 통과 (ADR-0007)
- 메인스레드 long-task >50ms 0 개 (Long Tasks API 모니터링)

### Risk class

**critical** — Pool 결정 변경은 *모든 worker 작업 재설계*.

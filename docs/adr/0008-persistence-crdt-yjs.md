# ADR-0008: Persistence + CRDT — Yjs + IndexedDB + Service Worker + WebSocket relay + append-only audit log

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: C7 (hash chain 양립), C8 (영속), E16 (CRDT round-trip), USP-3 동시작업, USP-5 영속성
- Related ADRs: ADR-0005 (어노 entity — CRDT op 표현 대상), ADR-0017 (위변조 hash chain — **양립 검증 필수**), ADR-0019 (RBAC)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §Phase 2 ADR-0008

> **bootstrap.md 명시: "ADR-0008 (Persistence + CRDT) 는 ADR-0017 (위변조방지) 와 *양립 검증 필수*. CRDT 의 *모든 op 가 hash chain 에* 들어가야 함 — 후속 추가가 아닌 *코어 동시 설계*."** 본 Group 3 의 *상위 입력*. ADR-0017 + ADR-0019 와 *동시 결정*.

## Context

옛 viewer 부채 인용:
- **메모리 only 폐기** — 작업이력이 메모리 only 였고 새로고침/세션 종료 시 손실. USP-5 의 직접 차단 대상.

USP 매핑 (본 ADR 이 동시 구현):
- **USP-3 (동시작업)** — CRDT 로 충돌 0
- **USP-5 (영속성)** — IndexedDB + 서버 sync, 메모리 only 폐기

요구:
- 모든 어노 op 가 CRDT op 표현 (E16)
- 모든 CRDT op 가 hash chain 의 input (C7, ADR-0017)
- 오프라인 30분 → 재접속 0 손실 (Phase 5 게이트)
- 1만 stroke 작업 후 새로고침 → 복원 <2s
- 2 클라이언트 100 stroke 동시 = 0 충돌

## Decision

**Yjs (CRDT) + IndexedDB (y-indexeddb) + Service Worker (오프라인) + WebSocket relay (y-websocket) + append-only audit log (own — ADR-0017 hash chain 통합)**.

### 1. CRDT 라이브러리 선택: Yjs vs Automerge

후보 비교:

| 기준 | **Yjs** | Automerge |
|---|---|---|
| 성숙도 / 생태계 | ◯ (가장 큰 CRDT 생태계) | ◯ (Ink & Switch 출신) |
| 바이너리 효율 | ◯ (encoding 매우 작음) | △ (JSON 기반) |
| TypeScript-first | ◯ | ◯ |
| 호환 모듈 (`y-indexeddb`, `y-websocket`, `y-webrtc`) | **◯** | △ (덜 풍부) |
| Awareness (presence) 프로토콜 | **◯** (기본) | △ (별도) |
| 문법·DX | △ (`Y.Doc` API, "shared types") | ◯ (proxy 식 mutation, 자연 JS) |
| **Inkvas 어노 entity 모델 (immutable) 호환** | ◯ (Y.Map<id, Stroke> 패턴) | ◯ |

**채택: Yjs** — 생태계 풍부 + 모듈 (y-indexeddb / y-websocket / y-webrtc) 즉시 사용. Inkvas 의 *entity 직렬화* 가 Y.Map<id, Stroke> 패턴으로 자연 매핑.

### 2. 데이터 모델

```ts
// CRDT Document 구조
const doc = new Y.Doc();

// 어노 entity map: { id → Stroke | Shape | TextBox | Note }
const annotations = doc.getMap<Entity>('annotations');

// 페이지 메타: { pageIndex → PageAnchor }
const pages = doc.getMap<PageAnchor>('pages');

// audit log (append-only): hash chain 의 *원본*
const auditLog = doc.getArray<AuditEntry>('audit');

type AuditEntry = {
  opId: string;        // ULID
  authorId: string;
  ts: number;
  op: CrdtOp;          // 어노 entity 추가/제거/속성 변경
  prevHash: string;    // 이전 audit entry 의 hash (Merkle chain)
  hash: string;        // 본 entry 의 hash = sha256(opId + authorId + ts + op + prevHash)
};
```

### 3. C7 (hash chain) 양립 — 핵심 설계

**모든 CRDT op 는 audit log 의 append 가 *동시 atomic*** — 하나만 적용되는 상태 절대 없음.

```ts
function applyAnnotationOp(op: CrdtOp) {
  // 1. hash 계산 (prev = audit.last.hash)
  const prevEntry = auditLog.get(auditLog.length - 1);
  const newEntry: AuditEntry = {
    opId: ulid(),
    authorId: currentUser.id,
    ts: Date.now(),
    op,
    prevHash: prevEntry?.hash ?? '0'.repeat(64),
    hash: '',  // 채워질 예정
  };
  newEntry.hash = sha256(JSON.stringify({ ...newEntry, hash: undefined }));

  // 2. Yjs transaction — atomic
  doc.transact(() => {
    // 2a. annotation map 갱신
    if (op.kind === 'add') annotations.set(op.entity.id, op.entity);
    if (op.kind === 'remove') annotations.delete(op.id);
    if (op.kind === 'update') annotations.set(op.id, op.entity);

    // 2b. audit log append (Merkle chain)
    auditLog.push([newEntry]);
  });

  // 3. Worker 에 hash chain compute offload (ADR-0006)
  workerPool.enqueue({ kind: 'HASH_CHAIN_COMPUTE', entry: newEntry });
}
```

**Yjs transaction** 의 atomicity 가 *어노 map 변경 + audit append 가 분리 불가*. 변조 시도 (외부 도구가 IndexedDB 직접 수정) 는 *audit hash 불일치* 로 검증 단계에서 즉시 감지 (ADR-0017).

### 4. 전송 채널

```
[로컬]
  Memory (Y.Doc)
    ↓ y-indexeddb (auto persist)
  IndexedDB
    ↓ Service Worker (오프라인 캐시)

[네트워크]
  Y.Doc updates
    ↓ y-websocket (CRDT delta encoding)
  WebSocket relay server (별도 ADR — 호스팅 결정 Phase 5+)
    ↓ broadcast
  다른 클라이언트 Y.Doc

[옵션 — WebRTC peer-to-peer]
  y-webrtc 로 *직접* 동기 (LAN / 저지연 시나리오)
```

WebSocket relay 가 기본, WebRTC 는 *peer-to-peer 선택* (Phase 5+ 박힘).

### 5. Service Worker (오프라인 30분 게이트)

- 모든 Yjs update 가 IndexedDB 로 즉시 영속 (y-indexeddb 자동)
- 네트워크 끊김 시 Yjs 가 *로컬 only* 모드 — 입력 계속 받음
- 재접속 시 *오프라인 동안 만들어진 update* 가 WebSocket 으로 전송 + 서버의 다른 클라이언트 update 가 도착 → Yjs CRDT 가 *자동 merge* (0 손실, 0 충돌)
- Service Worker 가 *연결 상태 알림* + *재시도 backoff* (1s → 32s exponential)

### 6. Presence (USP-2 협업)

```ts
const awareness = provider.awareness;
awareness.setLocalState({
  user: { id, name, color },
  cursor: { x, y },
  selection: { entityIds: [...] },
  tool: 'pen' | 'eraser' | ...,
});

awareness.on('change', () => {
  const states = awareness.getStates();
  // 다른 사용자 커서·선택·도구 시각화
});
```

Yjs 의 `awareness` 프로토콜이 *Inkvas presence* 의 baseline. 사용자별 색 (USP-2) 자동 할당.

### 7. undo/redo (USP-5 세션 한계 없음)

- Yjs 의 `Y.UndoManager` — undo/redo *기록을 CRDT op 로* 표현
- 모든 undo/redo op 도 audit log 의 append (C7)
- 세션 종료 → 재접속 시 IndexedDB 의 audit log 로 *전체 history* 복원 (1만 stroke <2s 목표)

### 8. RBAC 게이트 (E17, ADR-0019)

- 모든 op 가 *적용 전* RBAC 권한 확인
- viewer: 모든 op 거부 (읽기만)
- commenter: add comment op 만
- editor: add/update/remove op (모든 entity)
- owner: + delete 다른 사용자 op
- 서버 측 (WebSocket relay) 도 동일 RBAC 검증 (클라이언트 우회 차단)

## Alternatives Considered

### (a) Automerge

- Pros: proxy 식 mutation DX 자연
- Cons: 생태계 모듈 부족 (`automerge-repo` 가 있지만 y-indexeddb / y-websocket 만큼 검증 X). presence 별도 구현 부담.

### (b) Own OT (Operational Transform)

- Pros: 가장 작음
- Cons (결정적): CRDT 라이브러리의 *검증* 가치 포기. 솔로 dev 가 OT 알고리즘 직접 구현 = 사고 폭발 위험.

### (c) Server-authoritative (CRDT 안 씀)

- Pros: 가장 단순
- Cons (결정적): 오프라인 30분 시나리오 *불가능*. USP-3/5 직접 위반.

### 비교

| 기준 | (a) Automerge | (b) Own OT | (c) Server-authoritative | **(d) Yjs (채택)** |
|---|---|---|---|---|
| E16 CRDT round-trip | ◯ | △ | ✕ | **◯** |
| USP-3 0 충돌 | ◯ | △ | ✕ | **◯** |
| USP-5 오프라인 30분 0 손실 | ◯ | △ | ✕ | **◯** |
| C7 hash chain 양립 | ◯ | ◯ | △ | **◯** (Y.Doc transaction) |
| Presence (USP-2) | △ | ✕ | ✕ | **◯** (awareness) |
| 생태계 (IndexedDB / WS / WebRTC 모듈) | △ | ✕ | - | **◯** |

→ **(d) Yjs 채택**.

## Consequences

### 직접 박힘

- `packages/core/package.json` deps: `yjs`, `y-indexeddb`, `y-websocket`, `y-webrtc` (optional), `lib0` (yjs 의존)
- `packages/core/src/persistence/doc.ts` — Y.Doc + Y.Map / Y.Array 구조
- `packages/core/src/persistence/sync.ts` — WebSocket / WebRTC provider
- `packages/core/src/persistence/audit-chain.ts` — audit log + hash chain (ADR-0017 통합)
- `packages/core/src/persistence/undo.ts` — Y.UndoManager wrapper

### ADR-0017 와의 양립 검증

- Yjs transaction 안에서 *어노 map 변경 + audit append* 가 atomic
- 외부 변조 (IndexedDB 직접 수정) 는 *audit hash chain 불일치* 로 검증 단계 즉시 fail
- ADR-0017 의 hash chain compute 는 본 ADR 의 `auditLog` 를 *동일 input* 으로 사용

### Phase 5 Gate G5 명시

- 2 클라이언트 동시 편집 0 충돌
- 오프라인 30분 → 재접속 0 손실
- presence 갱신 지연 <200ms (Internet, 동일 region)
- CRDT 직렬화 크기 1000 stroke <100KB
- RBAC 권한 차단 정확도 100%

### Trade-off

- Yjs Y.Map<Entity> 패턴 — entity 가 *Yjs 친화 직렬화* (plain object) 필요. ADR-0005 의 immutable entity 와 정합.
- WebSocket relay 서버 호스팅 — Phase 5+ 별도 ADR / plan (self-host 옵션 + managed 옵션).
- Yjs encoded update binary — 가독성 약함 (디버깅 시 별도 도구 필요). 대응: audit log 의 *plain JSON* 형식이 ground truth.

### Risk class

**critical** — Persistence 결정 변경 시 모든 데이터 마이그레이션.

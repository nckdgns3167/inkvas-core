# ADR-0017: 위변조방지 아키텍처 — OSS hash chain + audit log / Enterprise PKI + HSM + 블록체인 anchoring

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: C7 (어노 변조 차단), C8 (영속), A1/A3 (license-boundary), P6-1 (PKI 키 보호)
- Related ADRs: ADR-0008 (Persistence + CRDT — **양립 설계**), ADR-0013 (Open-core 경계), ADR-0019 (RBAC)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §Phase 2 ADR-0017 (USP-1 코어)

> bootstrap.md 명시: *"ADR-0008 (Persistence + CRDT) 는 ADR-0017 (위변조방지) 와 양립 검증 필수. CRDT 의 모든 op 가 hash chain 에 들어가야 함 — 후속 추가가 아닌 코어 동시 설계."* 본 ADR 은 ADR-0008 의 *짝*.

## Context

USP-1 (위변조방지) 의 *시장 차별화 강도*:
- PDFaid / PDF24 / iLovePDF / Smallpdf / Adobe Online — ✕ (변조 검증 없음)
- PSPDFKit / Foxit / Apryse — △ (PKI 서명만, hash chain 없음)
- **Inkvas** — ◯ (hash chain + audit log OSS + PKI + 블록체인 anchoring Enterprise)

B2G·금융·법무·계약 영역의 *불변 요구* — 어노가 *언제 누가 어떤 순서로* 만들었는지 *암호학적* 증명. 변조 시도가 *검증 단계* 에서 즉시 fail.

요구 분리 (ADR-0013 Open-core 경계 정합):
- **OSS 측** (`@inkvas/core`): Hash chain + append-only audit log — *변조 *감지* 가능*
- **Enterprise 측** (`@inkvas-enterprise/chain`): PKI 서명 (RSA/ECDSA) + HSM + 블록체인 anchoring — *변조 *시점 증명* 가능*

ADR-0008 의 *모든 CRDT op = audit log append* 가 본 ADR 의 *전제*.

## Decision

**다층 위변조 아키텍처**:

```
Layer 1 — Hash chain (OSS, Apache-2.0)
├── 모든 어노 op 가 audit log 의 entry → entry hash 가 chain
├── Merkle-like: prev_hash + content → sha256 → 다음 op 의 prev
├── 변조 1건 발생 시 후속 모든 hash 가 깨짐 (감지율 100%)
└── 검증 CLI / UI 가 chain 전체 traverse → 검증 결과 표시

Layer 2 — PKI 서명 (Enterprise, commercial dual)
├── 사용자별 X.509 인증서 (조직 IdP 또는 자체 PKI)
├── 각 op 또는 일정 묶음 (예: 100 op 또는 30초 마다) 를 *digitally sign*
├── 서명 = RSA-PSS / ECDSA — chain hash 위에 *발신자 신원* 보증
├── 인증서 검증 (CRL/OCSP) 100% 정확도
└── 키 보호: HSM (PKCS#11 / KMIP) — P6-1

Layer 3 — 블록체인 anchoring (Enterprise, optional)
├── 일정 주기 (5분 / 1시간) 마다 audit chain 의 root hash 를 chain 에 anchor
├── 후보: Polygon (public, 저비용) / Ethereum (public, 신뢰성) / private chain (망분리)
├── third-party 시점 증명 — 클라이언트 측에서도 변조 불가
└── 망분리 환경 (Phase 7): private chain 기본
```

### 1. Layer 1 — OSS Hash chain (Apache-2.0)

ADR-0008 의 `auditLog` (Y.Array<AuditEntry>) 가 chain 의 *원본*:

```ts
type AuditEntry = {
  opId: string;        // ULID
  authorId: string;
  ts: number;
  op: CrdtOp;
  prevHash: string;    // 이전 entry 의 hash
  hash: string;        // sha256(opId + authorId + ts + JSON.stringify(op) + prevHash)
};

function verifyChain(audit: AuditEntry[]): { ok: boolean; firstBreak?: number } {
  let prevHash = '0'.repeat(64);
  for (let i = 0; i < audit.length; i++) {
    const e = audit[i];
    if (e.prevHash !== prevHash) return { ok: false, firstBreak: i };
    const expected = sha256(JSON.stringify({
      opId: e.opId,
      authorId: e.authorId,
      ts: e.ts,
      op: e.op,
      prevHash: e.prevHash,
    }));
    if (e.hash !== expected) return { ok: false, firstBreak: i };
    prevHash = e.hash;
  }
  return { ok: true };
}
```

C7 게이트: **변조 시도 100% 감지**. IndexedDB 직접 수정 / 네트워크 중간 수정 / 메모리 hijack 시도 등 모든 표면에서 chain 불일치 발생.

### 2. Layer 2 — Enterprise PKI 서명

```ts
// packages/enterprise/chain/src/pki-signer.ts
type SignedChunk = {
  chunkId: string;
  entries: AuditEntry[];      // 1 chunk = 100 op 또는 30초
  rootHash: string;            // chunk 의 Merkle root
  signature: ArrayBuffer;      // RSA-PSS or ECDSA 서명
  certPath: ArrayBuffer[];     // X.509 chain
  ts: number;
};

async function signChunk(entries: AuditEntry[], keyHandle: HSMKeyHandle): Promise<SignedChunk> {
  const rootHash = merkleRoot(entries.map(e => e.hash));
  const signature = await hsm.sign({
    keyHandle,                 // HSM 내부 키 — 평문 노출 0
    algorithm: 'RSA-PSS',
    data: bufferFromHex(rootHash),
  });
  return { chunkId: ulid(), entries, rootHash, signature, certPath: hsm.getCertPath(keyHandle), ts: Date.now() };
}
```

키는 HSM (PKCS#11 / KMIP) 안에만. 코드 안 평문 키 *절대* 없음 (P6-1).

### 3. Layer 3 — Enterprise 블록체인 anchoring

```ts
// packages/enterprise/chain/src/anchor.ts
async function anchorPeriodically(chunks: SignedChunk[]) {
  const treeRoot = merkleRoot(chunks.map(c => c.rootHash));
  const txHash = await blockchain.submit({
    chain: 'polygon' | 'private-chain' | 'eth',
    data: treeRoot,
    contractAddress: '0x...',
  });
  // txHash 가 *세 번째 변조 불가 증거* — 클라이언트·서버 모두 변조 불가
  auditLog.appendAnchor({ treeRoot, txHash, ts: Date.now(), chain });
}
```

망분리 환경 (Phase 7): private chain (예: Hyperledger Fabric, Besu private mode) 기본.

### 4. 검증 워크플로

```
사용자 / 감사자 / 법무 가 *위변조 감지* 트리거
   ↓
Layer 1 verifyChain(audit) — chain 무결성
   ↓
   ok → Layer 2 검증 (Enterprise) — 서명 + 인증서 + 발신자 신원
   fail → audit[firstBreak] 표시, 사고 회고 트리거 (ADR-0012)
   ↓
   ok → Layer 3 검증 (Enterprise, optional) — 블록체인 시점 증명
   ↓
   ok → 어노 변조 *없음 증명*
```

### 5. 호환성 (ADR-0008 와)

- **OSS 빌드** (`@inkvas/core` 단독): Layer 1 활성. 변조 *감지* 만.
- **Enterprise 빌드**: Layer 1 + 2 + 3. 변조 *시점 증명* + *발신자 신원 보증*.
- Plugin 등록 (ADR-0013): Enterprise 측이 *core 의 hash chain* 위에 *signing layer* register. core 는 enterprise 호환성 위해 *event hook* 만 제공.

```ts
// core 측 hook (OSS)
auditLog.on('appended', (entries: AuditEntry[]) => {
  // 빈 hook — enterprise 가 register 안 하면 no-op
});

// enterprise 측 register (Enterprise)
import { registerSigningPlugin } from '@inkvas-enterprise/chain';
registerSigningPlugin({
  async onEntry(entries) {
    if (entries.length >= 100 || timeSinceLastSign > 30_000) {
      const chunk = await signChunk(entries, keyHandle);
      auditLog.appendChunk(chunk);
    }
  },
});
```

### 6. 측정 지표 (Phase 6+ 게이트)

- Hash chain 검증 시간 (1000 entry): <50ms (UI 차단 없음)
- 변조 시뮬레이션 100건 감지율: 100%
- Audit log append 지연: <5ms/op
- 블록체인 anchoring 빈도: 5분/회 (Enterprise 기본)
- 인증서 chain 검증 정확도: 100% (CRL/OCSP)

## Alternatives Considered

### (a) PKI 서명만 (블록체인 없음)

- Pros: 단순, 인증서·HSM 인프라만
- Cons: *서명 키 침해* 시 과거 모든 서명 위협. 블록체인 anchoring 이 *과거 시점 증명* 추가 layer.

### (b) 블록체인 anchoring 만 (PKI 없음)

- Pros: 단순, 시점 증명 강함
- Cons: *발신자 신원 보증 없음* (any anonymous user can write to chain). B2G 인증 요구 부분 충족.

### (c) Hash chain만 (OSS, Enterprise 없음)

- Pros: 가장 단순, OSS 전용
- Cons: B2B/B2G 진입 *Enterprise tier 가 없음* — 수익 모델 + USP-1 의 강한 차별화 동시 손실

### (d) 3 layer 통합 ← **채택**

- OSS 사용자: Layer 1 만으로 *감지* 충분 (개인·SMB 가치)
- Enterprise 사용자: Layer 2 + 3 으로 *법적·컴플라이언스* 충족 (B2G/B2F 가치)

### 비교

| 기준 | (a) PKI only | (b) Chain only | (c) Hash only | **(d) 3 layer (채택)** |
|---|---|---|---|---|
| 변조 감지 (OSS) | △ | △ | ◯ | **◯** |
| 발신자 신원 보증 | ◯ | ✕ | ✕ | **◯** (Enterprise) |
| 과거 시점 증명 | △ | ◯ | ✕ | **◯** (Enterprise) |
| 망분리 호환 (P6-2) | ◯ | △ (private chain) | ◯ | **◯** (private chain) |
| OSS vs Enterprise 경계 분리 | ✕ | ✕ | ◯ | **◯** (clean split) |
| 시장 차별화 강도 | △ | △ | △ | **◯** |

## Consequences

### 직접 박힘

- `packages/core/src/integrity/hash-chain.ts` — verifyChain + sha256 + AuditEntry 형식
- `packages/core/src/integrity/event-hooks.ts` — Enterprise plugin register 지점
- `packages/enterprise/chain/` (Enterprise 레포): pki-signer / hsm-adapter / blockchain-anchor (Phase 6+ 본격)

### ADR-0008 양립 검증 — 완료

- Yjs transaction 안에서 어노 map + audit append atomic
- Hash chain compute = Worker offload (ADR-0006)
- 외부 변조 시도 = audit hash 불일치 → 검증 즉시 fail

### Phase 매핑

| Phase | 작업 |
|---|---|
| Phase 5 | Layer 1 (OSS hash chain) 본격 활성 — 모든 op 영향 |
| Phase 6 | Layer 2 (Enterprise PKI + HSM) 본격 — `packages/enterprise/chain` 구현 |
| Phase 7 | Layer 3 (블록체인 anchoring) — 망분리 환경 private chain 검증 |

### Trade-off

- Hash chain compute 비용 — sha256 가 op 마다. Worker offload 로 메인스레드 부담 0 (ADR-0006).
- Audit log size 증가 — chain entry 가 *영구 영속*. 1만 op = 1만 entry × ~200B = ~2MB. IndexedDB 부담 미미.
- Enterprise 측 HSM 인프라 운영 부담 — *호스트 측 책임* (고객사 HSM 인증서 발급).

### Risk class

**critical** — USP-1 의 코어. 변경 시 모든 감사 추적 데이터 영향.

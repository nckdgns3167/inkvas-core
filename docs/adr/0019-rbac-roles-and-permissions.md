# ADR-0019: 권한·역할 모델 (RBAC) — OSS 4종 기본 + Enterprise custom role 확장

- Status: **Accepted (2026-05-12)** — Group [1-4] batch confirm 통과
- Constraints affected: E17 (RBAC 게이트), A1/A3 (license-boundary)
- Related ADRs: ADR-0008 (Persistence + CRDT — 모든 op 가 RBAC 통과), ADR-0017 (위변조 — author 신원 검증), ADR-0013 (Open-core 경계)
- Related plans: `docs/plans/0001-bootstrap-from-zero.md` §Phase 2 ADR-0019 (USP-2 협업 코어)

> bootstrap.md 명시: *"USP-2 협업 코어. Open-core 경계 의 추가 input."* — OSS 측에 *기본 4 종 role*, Enterprise 측에 *custom role 확장*.

## Context

USP-2 (협업) 의 baseline:
- 멀티 사용자 동시 접속
- 사용자별 권한·역할 분리
- 사용자별 색·표시 (presence — ADR-0008)
- 코멘트 스레드 + mention

협업 환경의 *권한 시나리오*:
- 문서 작성자가 *읽기 전용 공유 링크* 발송
- 팀 리뷰어가 *코멘트만 추가* 권한
- 편집자가 *모든 어노 작성·수정·삭제*
- 관리자 (owner) 가 *권한 변경 + 다른 사용자 op 삭제* 권한
- B2G/금융 환경의 *페이지별·도구별·시간 한정* 권한 (Enterprise)

## Decision

**OSS 기본 4종 (viewer / commenter / editor / owner) + Enterprise custom role 확장**.

### 1. OSS 기본 4종 role (Apache-2.0)

```ts
type Role = 'viewer' | 'commenter' | 'editor' | 'owner';

type Permissions = {
  read: boolean;                  // 어노 보기
  presence: boolean;              // 커서·선택 시각화
  comment: boolean;               // sticky note / 코멘트 스레드
  annotateOwn: boolean;           // 본인 어노 추가·수정·삭제
  annotateAny: boolean;           // 모든 사용자 어노 수정·삭제 (덮어쓰기)
  managePermissions: boolean;     // 다른 사용자 role 변경
};

const DEFAULT_PERMISSIONS: Record<Role, Permissions> = {
  viewer:    { read: true, presence: true, comment: false, annotateOwn: false, annotateAny: false, managePermissions: false },
  commenter: { read: true, presence: true, comment: true,  annotateOwn: false, annotateAny: false, managePermissions: false },
  editor:    { read: true, presence: true, comment: true,  annotateOwn: true,  annotateAny: false, managePermissions: false },
  owner:     { read: true, presence: true, comment: true,  annotateOwn: true,  annotateAny: true,  managePermissions: true },
};
```

### 2. RBAC 게이트 적용 위치 (E17 핵심)

```ts
// packages/core/src/permissions/rbac.ts
function canApplyOp(user: User, op: CrdtOp, doc: Document): boolean {
  const role = doc.permissions.get(user.id) ?? 'viewer';
  const perms = DEFAULT_PERMISSIONS[role];

  // op kind 별 권한 확인
  if (op.kind === 'add') {
    if (op.entity.kind === 'note' || op.entity.kind === 'comment') {
      return perms.comment;
    }
    return perms.annotateOwn;
  }
  if (op.kind === 'update' || op.kind === 'remove') {
    const targetEntity = doc.annotations.get(op.id);
    if (!targetEntity) return false;
    if (targetEntity.authorId === user.id) return perms.annotateOwn;
    return perms.annotateAny;  // 다른 사용자의 entity 수정/삭제
  }
  return false;
}

// 어노 op 적용 *전* 확인 (ADR-0008 의 applyAnnotationOp 시작점)
function applyAnnotationOp(op: CrdtOp) {
  if (!canApplyOp(currentUser, op, doc)) {
    throw new PermissionDeniedError(`User ${currentUser.id} cannot perform ${op.kind} on ${op.id}`);
  }
  // ... ADR-0008 의 transaction
}
```

### 3. 서버 측 동등 검증 (클라이언트 우회 차단)

WebSocket relay 서버 (ADR-0008) 가 *모든 incoming Yjs update* 에 대해 동일 RBAC 검증 — 클라이언트가 RBAC 우회한 *forged update* 도 서버에서 거부.

### 4. Presence (USP-2) 의 RBAC 연동

```ts
awareness.setLocalState({
  user: { id, name, color, role },  // role 도 함께 publish
  cursor: { x, y },
  selection: { entityIds: [...] },
  tool: 'pen' | 'eraser' | ...,
});

// 다른 사용자 cursor 시각화 시 role 별 색·표시
// viewer = 회색 + 'eye' 아이콘 / commenter = 노랑 + 'message' / editor = 파랑 + 'edit' / owner = 보라 + 'crown'
```

### 5. Enterprise custom role (commercial dual)

```ts
// packages/enterprise/rbac/src/custom-roles.ts
type CustomRole = {
  id: string;
  name: string;
  inheritsFrom?: Role;             // 기본 role 의 권한 상속
  permissions: Partial<Permissions> & {
    // Enterprise 특화 권한
    redactCertified?: boolean;     // certified redaction (ADR-0017 PKI)
    exportAuditLog?: boolean;
    accessSensitivePages?: number[];  // 페이지별 권한
    timeWindow?: { from: Date; to: Date };  // 시간 한정 권한
    toolRestrictions?: ('pen' | 'eraser' | 'shape')[];  // 도구별 권한
  };
};

// 등록 (Plugin contract, ADR-0013)
import { registerRolePlugin } from '@inkvas-enterprise/rbac';
registerRolePlugin({
  defineRole: (role: CustomRole) => { ... },
  resolvePermissions: (user, doc) => { ... },
});
```

### 6. 사용자 관리 워크플로

OSS:
- Document 의 `permissions` Y.Map<userId, Role> — owner 가 owner-only UI 로 다른 사용자 role 변경
- Magic link / token 기반 *공유 링크* — link 자체에 role 박힘 (`?role=viewer&token=...`)

Enterprise:
- IdP (SSO/SAML/LDAP) 연동 — `@inkvas-enterprise/sso` plugin
- 그룹·팀 관리 UI — `@inkvas-enterprise/admin-dashboard`
- 시간 한정 / 페이지별 / 도구별 권한 — custom role

### 7. ADR-0017 (위변조) 와의 양립

- 모든 op 의 `authorId` 가 hash chain 의 input
- 변조 시도 시 *authorId 변경* 도 chain hash 깨짐 → 즉시 감지
- Enterprise PKI 서명 = *authorId 의 신원 보증* (서명자 인증서 = authorId)

## Alternatives Considered

### (a) Role 없음 (모든 사용자 동일 권한)

- Pros: 가장 단순
- Cons (결정적): 협업 환경 신뢰 경계 0. USP-2 위반.

### (b) 2 role (read-only / edit)

- Pros: 단순
- Cons: commenter role 부재 — *코멘트만* 시나리오 차단. 시장 표준 (Google Docs 등) 과 mismatch.

### (c) ACL (Access Control List) — 사용자별 권한 개별 정의

- Pros: 가장 유연
- Cons (결정적): 솔로 dev 가 UI/관리 부담 폭발. 권한 변경 추적 어려움. RBAC 의 *role abstraction* 가 운영 단순화.

### (d) OSS 4종 + Enterprise custom ← **채택**

위 (a)~(c) 의 trade-off — *(d) 가 OSS 단순도 + Enterprise 유연성 양쪽 충족*.

### 비교

| 기준 | (a) Role 없음 | (b) 2 role | (c) ACL | **(d) 4종 + custom (채택)** |
|---|---|---|---|---|
| USP-2 신뢰 경계 | ✕ | △ | ◯ | **◯** |
| 시장 표준 (Google Docs) 정합 | ✕ | △ | ◯ | **◯** |
| 솔로 dev UI 부담 | ◯ | ◯ | ✕ | **◯** (4종 만) |
| Enterprise 유연성 | ✕ | ✕ | ◯ | **◯** (custom plugin) |
| Open-core 경계 (A1/A3) | - | ◯ | ✕ (전부 OSS) | **◯** (clean split) |

## Consequences

### 직접 박힘

- `packages/core/src/permissions/rbac.ts` — 4 role + Permissions + canApplyOp
- `packages/core/src/permissions/sharing.ts` — magic link / token 기반 공유
- `packages/enterprise/rbac/` (Enterprise 레포): custom role + IdP 연동 + 그룹 관리

### ADR-0008 통합

- `applyAnnotationOp` 의 *전제 조건* — `canApplyOp(user, op, doc)` 반드시 통과
- 서버 측 (WebSocket relay) 동일 검증

### Phase 5 Gate G5 명시

- 50 사용자 동시 접속 부하 — 서버 CPU <50% (1 vCPU 기준)
- RBAC 권한 차단 정확도 100% (E2E test 의 *우회 시뮬레이션* 포함)
- 코멘트 스레드 응답 지연 <200ms (presence 와 동일 채널)

### Phase 6 Enterprise

- IdP 연동 (SSO/SAML/OAuth/LDAP) — `@inkvas-enterprise/sso`
- 그룹·팀 관리 UI — `@inkvas-enterprise/admin-dashboard`
- Custom role registry

### Trade-off

- 4 종 기본 role 은 *프로 도구 표준* (Google Docs / Figma 유사) — 사용자 학습 부담 미미.
- Enterprise custom role 의 *UI 복잡도* — 솔로 dev Phase 6 까지 시간 투자 필요.

### Risk class

**critical** — RBAC 변경 시 모든 op 경로 + 서버 검증 + UI 영향. supersede 시 backward compat 마이그레이션 필수.

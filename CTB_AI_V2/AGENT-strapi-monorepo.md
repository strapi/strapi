# Agent brief — Strapi monorepo (v2 AI client)

> **Repo:** `github.com/strapi/strapi` — branch `feat/ctb-rename-migration-builder` (or child of `develop`).  
> **Read first:** [`HANDOFF.md`](HANDOFF.md) in `CTB_AI_V2/`.  
> **Parallel work:** strapi-ai agent implements `/schemas/chat/v2` — you implement the client against the contract in HANDOFF.

---

## Goal

Replace the v1 AI apply path (`transformChatToCTB` → `applyChange`) with a thin
dispatcher that calls existing `DataManager` methods for each `CTBOperation` from
`tool-schemaOperationsTool`. Renames must flow through `editAttribute` → `recordRename`
→ existing save / rename-migration pipeline.

---

## Done criteria

- [ ] `CTBOperation` types mirrored at `packages/core/content-type-builder/admin/src/components/AIChat/lib/types/ctb-operations.ts` (sync with strapi-ai `@ai/types`)
- [ ] `applyCTBOperations.ts` — maps each `op` to `DataManager` method; handles wiring quirks (see below)
- [ ] `OperationsProvider.tsx` (or refactor `SchemaProvider.tsx`) — extracts ops from `tool-schemaOperationsTool`, calls `applyCTBOperations` in order
- [ ] v2 URL: `STRAPI_AI_CHAT_URL` → `/schemas/chat/v2` behind feature flag or Strapi version check; v1 fallback retained
- [ ] `Message.tsx` markers for `tool-schemaOperationsTool`
- [ ] Unit tests: dispatcher calls correct methods; `editAttribute` rename → `renames[]` in state
- [ ] Remove or gate v1 `toCTB` rename inference when v2 enabled (avoid double-handling)
- [ ] `yarn test:front` for content-type-builder passes
- [ ] Manual test plan documented (or API test if feasible with mocked stream)

---

## Where to start

| File                                                                    | Purpose                           |
| ----------------------------------------------------------------------- | --------------------------------- |
| `admin/src/components/AIChat/providers/SchemaProvider.tsx`              | v1 apply — replace for v2         |
| `admin/src/components/AIChat/lib/constants.ts`                          | AI URL                            |
| `admin/src/components/AIChat/providers/ChatProvider.tsx`                | Sends `schemas` context body      |
| `admin/src/components/DataManager/DataManagerContext.ts`                | Public API to call                |
| `admin/src/components/DataManager/DataManagerProvider.tsx`              | Method wiring + confirm dialogs   |
| `admin/src/components/DataManager/reducer.ts`                           | `recordRename` in `editAttribute` |
| `admin/src/components/DataManager/tests/reducerRenameAttribute.test.ts` | Rename behaviour tests            |

---

## Implementation guide

### 1. Mirror types

Copy `CTBOperation` union from HANDOFF.md into `lib/types/ctb-operations.ts`.

### 2. `applyCTBOperations`

Location: `admin/src/components/AIChat/lib/applyCTBOperations.ts`

```typescript
export function applyCTBOperations(
  operations: CTBOperation[],
  dm: Pick<DataManagerContextValue /* methods listed in HANDOFF */>,
  options?: { dispatch?: AppDispatch } // for delete bypass
): void {
  for (const operation of operations) {
    switch (operation.op) {
      case 'createSchema':
        dm.createSchema({ uid: operation.uid, data: operation.data });
        break;
      case 'editAttribute':
        dm.editAttribute({
          forTarget: operation.forTarget,
          targetUid: operation.targetUid,
          name: operation.name,
          attributeToSet: operation.attributeToSet,
        });
        break;
      case 'removeAttribute':
        dm.removeAttribute({
          forTarget: operation.forTarget,
          targetUid: operation.targetUid,
          attributeToRemoveName: operation.attributeToRemoveName,
        });
        break;
      case 'updateComponentSchema':
        dm.updateComponentSchema({
          componentUID: operation.uid as any,
          data: operation.data,
        });
        break;
      case 'deleteContentType':
        // Bypass window.confirm — dispatch actions.deleteContentType directly
        options?.dispatch(actions.deleteContentType(operation.uid as any));
        break;
      // … all ops from HANDOFF
    }
  }
}
```

**Wiring quirks (required):**

| Op                                      | Issue                                          | Fix                                                                                            |
| --------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `deleteContentType` / `deleteComponent` | `DataManagerProvider` shows `window.confirm`   | Dispatch `actions.delete*` directly via store, or add `deleteContentTypeWithoutConfirm` for AI |
| `updateComponentSchema`                 | Provider expects `componentUID`, op uses `uid` | Map in dispatcher                                                                              |
| `updateComponentUid`                    | Provider expects `componentUID`                | Map in dispatcher                                                                              |
| `removeAttribute`                       | Reducer action is `removeField`                | Call public `removeAttribute` — already mapped                                                 |

### 3. OperationsProvider

Refactor `SchemaProvider.tsx` or add sibling provider:

```typescript
function extractOperationsFromMessage(message: AIMessage): CTBOperation[] {
  // part.type === 'tool-schemaOperationsTool'
  // part.output.operations
}

useEffect(() => {
  if (status !== 'ready') return;
  const ops = extractOperationsFromMessage(latestAssistantMessage);
  if (!ops.length) return;
  applyCTBOperations(ops, dataManager, { dispatch });
  setLastRevisedId(message.id);
}, [messages, status]);
```

Keep v1 path when `part.type === 'tool-schemaGenerationTool'` until phase 3.

### 4. URL / version flag

`constants.ts`:

```typescript
export const STRAPI_AI_CHAT_URL_V2 = `${STRAPI_AI_URL}/schemas/chat/v2`;
```

`useAIFetch` / `ChatProvider` — use v2 URL when `features.ctbAiOperationsV2` or env flag.

Request body: add `ctbApiVersion: 2` per HANDOFF.

### 5. Message UI

`Message.tsx` — add `isOperationsToolPart`, `toMarkerFromOperationsTool` showing op list.

### 6. Do NOT change save / server path

`saveSchema` → `cleanData` → `update-schema` → `generateRenameMigrations` stays as-is.
Verify `renames[]` appears in state after AI ops before save.

### 7. Interim `toCTB.ts` rename inference

If v2 flag on, skip v1 `applyChange` entirely for that message. The client-side
rename inference added to `toCTB.ts` is a v1 safety net — document as deprecated when v2 ships.

---

## Tests to add

### `applyCTBOperations.test.ts`

- Mock DataManager methods
- Assert rename op calls `editAttribute` with correct `name` / `attributeToSet.name`
- Assert delete dispatches without confirm

### Integration with reducer (optional but valuable)

```typescript
// Apply ops through real reducer via dispatch
dispatch sequence → expect state.contentTypes[uid].renames
```

Reuse patterns from `reducerRenameAttribute.test.ts`.

### Run

```bash
cd packages/core/content-type-builder
yarn test:front --testPathPattern=applyCTBOperations
yarn test:front --testPathPattern=OperationsProvider
yarn test:unit   # server unaffected but run if touching shared types
```

---

## Manual verification (until E2E with real AI)

1. Mock assistant message with `tool-schemaOperationsTool` output in devtools / test harness
2. Confirm CTB shows field renamed (not removed+added)
3. Save → rename migration modal shows hop
4. Accept → migration file written

---

## Feature flag suggestion

```typescript
// ChatProvider or config
const useCtbOperationsV2 = process.env.STRAPI_AI_CTB_V2 === 'true';
```

Enables parallel development before strapi-ai v2 deploys to production.

---

## Pitfalls

- **Calling `deleteContentType` on provider** — confirm dialog blocks AI flow
- **Op order matters** — apply sequentially, never parallelize
- **`useEffect` deps** — avoid re-applying same message (track `lastRevisedId` / op batch id)
- **Undo stack** — each op should be separate history entry (dispatch per op, not one bulk)
- **Guided tour** — preserve existing `addField` tour dispatch from SchemaProvider if still relevant

---

## Suggested branch name

`feat/ctb-ai-operations-v2-client`

---

## Key dependency on strapi-ai

Client can be developed against **fixture operations** before strapi-ai v2 is live.
Use examples from `HANDOFF.md` in unit tests.

When strapi-ai ships, point `STRAPI_AI_CHAT_URL` to v2 and integration-test end-to-end.

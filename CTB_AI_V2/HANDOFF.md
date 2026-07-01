# CTB AI v2 — Full Reference & Handoff

> Last updated: 2026-06-22.  
> Repos: **strapi** (`packages/core/content-type-builder/…`) + **strapi-ai** (`../ai-server`).

---

## TL;DR

|                  | v1 (today)                                     | v2 (target)                                            |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------ |
| AI output        | Full schema snapshots (`schemaGenerationTool`) | Ordered admin ops (`schemaOperationsTool`)             |
| Client apply     | `transformChatToCTB` → `applyChange`           | Dispatch to `DataManager` methods 1:1                  |
| Renames          | Lost (REMOVED + NEW) unless inferred           | `editAttribute` → `recordRename` → `renames[]`         |
| Save / migration | Same endpoint                                  | **Unchanged** — ops populate state, save does the rest |

---

## Problem statement

The rename-migration branch expects explicit ordered `renames: [{ oldName, newName }]`
per updated type. The manual CTB UI gets this via `editAttribute` → `recordRename`.

The AI chat path uses `applyChange`, which bulk-replaces a schema and produces
`REMOVED` + `NEW` attributes for renames — **no `renames[]`**, so data-preserving
migrations are not generated.

Complex cases (swap `A ↔ B`, chain `B→c, A→B, new A`) cannot be recovered from
schema snapshots alone.

**Solution:** strapi-ai returns the same ordered operations the UI would dispatch.

---

## Architecture

```
┌─────────────────┐   operations[]    ┌─────────────────────┐   DataManager.*()   ┌──────────────┐
│   strapi-ai     │ ──────────────► │ OperationsProvider  │ ──────────────────► │ reducer state │
│ schemaOperations│   1:1 payload   │ (thin dispatcher)   │   literal methods   │ + renames[]  │
│     Tool        │                 └─────────────────────┘                     └──────┬───────┘
└─────────────────┘                                                                    │
                                                                                       │ saveSchema()
                                                                                       ▼
                                                                              ┌─────────────────┐
                                                                              │ update-schema   │
                                                                              │ generateRename  │
                                                                              │ Migrations      │
                                                                              └─────────────────┘
```

**No new server-side "operations → migration" layer.** Operations → reducer state →
existing `cleanData` → `collectRenames` → migration file.

---

## Frontend operation catalog

Source of truth:

- Public API: `packages/core/content-type-builder/admin/src/components/DataManager/DataManagerContext.ts`
- Wiring: `…/DataManager/DataManagerProvider.tsx`
- Reducer: `…/DataManager/reducer.ts`

### Schema lifecycle

| Public method           | Reducer action          | Payload                                                                                          |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `createSchema`          | `createSchema`          | `{ uid, data: { displayName, singularName, pluralName, kind, draftAndPublish, pluginOptions } }` |
| `createComponentSchema` | `createComponentSchema` | `{ uid, componentCategory, data: { icon, displayName } }`                                        |
| `updateSchema`          | `updateSchema`          | `{ uid, data: { displayName, kind, draftAndPublish, pluginOptions } }`                           |
| `updateComponentSchema` | `updateComponentSchema` | Provider: `{ componentUID, data }` → reducer: `{ uid, data: { icon, displayName, category? } }`  |
| `deleteContentType`     | `deleteContentType`     | `uid: string`                                                                                    |
| `deleteComponent`       | `deleteComponent`       | `uid: string`                                                                                    |

### Field / attribute

| Public method              | Reducer action             | Payload                                           | Notes                                                                  |
| -------------------------- | -------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| `addAttribute`             | `addAttribute`             | `{ forTarget, targetUid, attributeToSet }`        | Creates bidirectional relation inverse side                            |
| `editAttribute`            | `editAttribute`            | `{ forTarget, targetUid, name, attributeToSet }`  | **Rename:** `name` = old, `attributeToSet.name` = new → `recordRename` |
| `removeAttribute`          | **`removeField`**          | `{ forTarget, targetUid, attributeToRemoveName }` | Public name ≠ reducer name                                             |
| `moveAttribute`            | `moveAttribute`            | `{ forTarget, targetUid, from, to }`              | Display order only                                                     |
| `addCustomFieldAttribute`  | `addCustomFieldAttribute`  | same as `addAttribute`                            | Phase 2                                                                |
| `editCustomFieldAttribute` | `editCustomFieldAttribute` | same as `editAttribute`                           | No `recordRename`                                                      |

### Dynamic zones

| Public method                      | Reducer action                     | Payload                                                          |
| ---------------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| `addCreatedComponentToDynamicZone` | `addCreatedComponentToDynamicZone` | `{ forTarget, targetUid, dynamicZoneTarget, componentsToAdd[] }` |
| `changeDynamicZoneComponents`      | `changeDynamicZoneComponents`      | `{ forTarget, targetUid, dynamicZoneTarget, newComponents[] }`   |
| `removeComponentFromDynamicZone`   | `removeComponentFromDynamicZone`   | `{ forTarget, targetUid, dzName, componentToRemoveIndex }`       |

### Component UID (unsaved only)

| Public method        | Reducer action       | Payload                                                          | Notes                        |
| -------------------- | -------------------- | ---------------------------------------------------------------- | ---------------------------- |
| `updateComponentUid` | `updateComponentUid` | `{ componentUID, newComponentUID }` → `{ uid, newComponentUID }` | Only when `status === 'NEW'` |

### NOT AI operations

|                                               | Reason                                          |
| --------------------------------------------- | ----------------------------------------------- |
| `applyChange`                                 | v1 AI bulk path — **replace**, do not use in v2 |
| `saveSchema`                                  | User-triggered persist                          |
| `history.undo` / `redo` / `discardAllChanges` | Local UI                                        |
| `init`, `reloadPlugin`                        | Bootstrap / internal                            |

### v1 AI path (to retire)

`SchemaProvider.tsx` → `extractSchemaChangesFromMessage` → `transformChatToCTB` →
`applyChange`. Only understands `tool-schemaGenerationTool`.

---

## v2 ↔ frontend alignment

Planned v2 `op` field = **public `DataManager` method name**.

| v2 `op`                            | Frontend method                    | Aligned | Dispatcher notes                                        |
| ---------------------------------- | ---------------------------------- | ------- | ------------------------------------------------------- |
| `createSchema`                     | `createSchema`                     | ✅      |                                                         |
| `createComponentSchema`            | `createComponentSchema`            | ✅      |                                                         |
| `addAttribute`                     | `addAttribute`                     | ✅      |                                                         |
| `editAttribute`                    | `editAttribute`                    | ✅      | Renames, swaps (as hop sequences)                       |
| `removeAttribute`                  | `removeAttribute`                  | ✅      | Dispatch `actions.removeField` or call method           |
| `updateSchema`                     | `updateSchema`                     | ✅      |                                                         |
| `updateComponentSchema`            | `updateComponentSchema`            | ⚠️      | Map `uid` → `componentUID` for provider                 |
| `deleteContentType`                | `deleteContentType`                | ⚠️      | **Bypass `window.confirm`** — dispatch reducer directly |
| `deleteComponent`                  | `deleteComponent`                  | ⚠️      | **Bypass `window.confirm`**                             |
| `changeDynamicZoneComponents`      | `changeDynamicZoneComponents`      | ✅      | Phase 1                                                 |
| `removeComponentFromDynamicZone`   | `removeComponentFromDynamicZone`   | ✅      | Phase 1                                                 |
| `moveAttribute`                    | `moveAttribute`                    | ✅      | Phase 2                                                 |
| `addCreatedComponentToDynamicZone` | `addCreatedComponentToDynamicZone` | ✅      | Phase 2                                                 |
| `addCustomFieldAttribute`          | `addCustomFieldAttribute`          | ✅      | Phase 2                                                 |
| `editCustomFieldAttribute`         | `editCustomFieldAttribute`         | ✅      | Phase 2                                                 |
| `updateComponentUid`               | `updateComponentUid`               | ✅      | Phase 2                                                 |

### Rename behaviour (why `editAttribute` matters)

From `reducer.ts` `recordRename`:

- Appends `{ oldName, newName }` to `type.renames` on each `editAttribute` where
  `attributeToSet.name !== name` and the field is not `NEW`.
- Ordered hops are preserved verbatim (chains, swaps via temp names).
- Serialized by `cleanData.ts` on save; consumed by server `collectRenames` in
  `packages/core/content-type-builder/server/src/services/schema.ts`.

---

## Wire contract

### Request (Strapi → strapi-ai)

```
POST /schemas/chat/v2
```

```typescript
{
  id: string;
  messages: UIMessage[];
  schemas?: Schema[];           // read-only context (existing v1 shape via fromCTB)
  ctbApiVersion: 2;
  metadata?: { lastSeenSchemas?: string[] };
}
```

v1 `POST /schemas/chat` unchanged for older Strapi versions.

### Response (streaming)

AI SDK UI message stream. Assistant message contains:

```
part.type === 'tool-schemaOperationsTool'
part.output === { operations: CTBOperation[] }
```

### `CTBOperation` union (canonical: strapi-ai `@ai/types`)

```typescript
type ForTarget = 'contentType' | 'component';

type CTBOperation =
  | {
      op: 'createSchema';
      uid: string;
      data: {
        displayName: string;
        singularName: string;
        pluralName: string;
        kind: 'collectionType' | 'singleType';
        draftAndPublish: boolean;
        pluginOptions: Record<string, unknown>;
      };
    }
  | {
      op: 'createComponentSchema';
      uid: string;
      componentCategory: string;
      data: { icon: string; displayName: string };
    }
  | {
      op: 'addAttribute';
      forTarget: ForTarget;
      targetUid: string;
      attributeToSet: Record<string, unknown>;
    }
  | {
      op: 'editAttribute';
      forTarget: ForTarget;
      targetUid: string;
      name: string; // current field name
      attributeToSet: Record<string, unknown>; // includes new `name` when renaming
    }
  | {
      op: 'removeAttribute';
      forTarget: ForTarget;
      targetUid: string;
      attributeToRemoveName: string;
    }
  | {
      op: 'updateSchema';
      uid: string;
      data: {
        displayName: string;
        kind: 'collectionType' | 'singleType';
        draftAndPublish: boolean;
        pluginOptions: Record<string, unknown>;
      };
    }
  | {
      op: 'updateComponentSchema';
      uid: string;
      data: { icon: string; displayName: string; category?: string };
    }
  | { op: 'deleteContentType'; uid: string }
  | { op: 'deleteComponent'; uid: string }
  | {
      op: 'changeDynamicZoneComponents';
      forTarget: ForTarget;
      targetUid: string;
      dynamicZoneTarget: string;
      newComponents: string[];
    }
  | {
      op: 'removeComponentFromDynamicZone';
      forTarget: ForTarget;
      targetUid: string;
      dzName: string;
      componentToRemoveIndex: number;
    }
  // Phase 2:
  | {
      op: 'moveAttribute';
      forTarget: ForTarget;
      targetUid: string;
      from: number;
      to: number;
    }
  | {
      op: 'addCreatedComponentToDynamicZone';
      forTarget: ForTarget;
      targetUid: string;
      dynamicZoneTarget: string;
      componentsToAdd: string[];
    }
  | {
      op: 'addCustomFieldAttribute';
      forTarget: ForTarget;
      targetUid: string;
      attributeToSet: Record<string, unknown>;
    }
  | {
      op: 'editCustomFieldAttribute';
      forTarget: ForTarget;
      targetUid: string;
      name: string;
      attributeToSet: Record<string, unknown>;
    }
  | { op: 'updateComponentUid'; uid: string; newComponentUID: string };

export type CTBOperationsResult = {
  operations: CTBOperation[];
};
```

> `@ai/types` already notes: _"Any change in this package should also be reflected
> in the strapi monorepo."_ Mirror at
> `packages/core/content-type-builder/admin/src/components/AIChat/lib/types/ctbOperations.ts`.

---

## Worked examples

### Simple rename

```json
{
  "operations": [
    {
      "op": "editAttribute",
      "forTarget": "contentType",
      "targetUid": "api::article.article",
      "name": "title",
      "attributeToSet": {
        "name": "heading",
        "type": "string",
        "required": true
      }
    }
  ]
}
```

Reducer produces `renames: [{ "oldName": "title", "newName": "heading" }]`.

### Swap A ↔ B (three hops)

```json
{
  "operations": [
    {
      "op": "editAttribute",
      "forTarget": "contentType",
      "targetUid": "api::x.x",
      "name": "a",
      "attributeToSet": { "name": "__ctb_swap_tmp", "type": "string" }
    },
    {
      "op": "editAttribute",
      "forTarget": "contentType",
      "targetUid": "api::x.x",
      "name": "b",
      "attributeToSet": { "name": "a", "type": "string" }
    },
    {
      "op": "editAttribute",
      "forTarget": "contentType",
      "targetUid": "api::x.x",
      "name": "__ctb_swap_tmp",
      "attributeToSet": { "name": "b", "type": "string" }
    }
  ]
}
```

strapi-ai validator should generate temp names and verify collision-freedom per hop.
Optional macro: `{ "op": "swapFields", "a": "a", "b": "b" }` expanded server-side.

### Chain: B→c, A→B, new A

```json
{
  "operations": [
    {
      "op": "editAttribute",
      "forTarget": "contentType",
      "targetUid": "api::x.x",
      "name": "b",
      "attributeToSet": { "name": "c", "type": "string" }
    },
    {
      "op": "editAttribute",
      "forTarget": "contentType",
      "targetUid": "api::x.x",
      "name": "a",
      "attributeToSet": { "name": "b", "type": "string" }
    },
    {
      "op": "addAttribute",
      "forTarget": "contentType",
      "targetUid": "api::x.x",
      "attributeToSet": { "name": "a", "type": "string" }
    }
  ]
}
```

### New collection type with fields

```json
{
  "operations": [
    {
      "op": "createSchema",
      "uid": "api::article.article",
      "data": {
        "displayName": "Article",
        "singularName": "article",
        "pluralName": "articles",
        "kind": "collectionType",
        "draftAndPublish": true,
        "pluginOptions": { "i18n": { "localized": false } }
      }
    },
    {
      "op": "addAttribute",
      "forTarget": "contentType",
      "targetUid": "api::article.article",
      "attributeToSet": { "name": "title", "type": "string", "required": true }
    },
    {
      "op": "addAttribute",
      "forTarget": "contentType",
      "targetUid": "api::article.article",
      "attributeToSet": {
        "name": "slug",
        "type": "uid",
        "targetField": "title",
        "required": true
      }
    }
  ]
}
```

---

## strapi-ai v1 baseline (for migration)

| Piece           | Location                                                                   |
| --------------- | -------------------------------------------------------------------------- |
| Chat route      | `apps/server/src/routes/schemas/chat.ts` → `POST /schemas/chat`            |
| Agent           | `packages/ai/architect/src/services/chat/chat-agent.ts`                    |
| Tool            | `…/tools/generateSchema/createSchemaGenerateTool.ts`                       |
| Schema types    | `packages/ai/types/src/schema.ts`                                          |
| Validation      | `…/validation/validate-schema.ts` + `validators/`                          |
| Prompts         | `makeIntroductionSystemPrompt.ts`, `makeStrapiSchemaDesignSystemPrompt.ts` |
| Client constant | Strapi `AIChat/lib/constants.ts` → `STRAPI_AI_CHAT_URL`                    |

v1 tool name: `schemaGenerationTool`.  
v1 client part type: `tool-schemaGenerationTool`.

---

## Implementation status

| Item                              | strapi-ai                                                       | Strapi monorepo                                 |
| --------------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| `CTBOperation` types              | ✅ `packages/ai/types/src/ctb-operations.ts` + Zod in architect | ✅ `AIChat/lib/types/ctbOperations.ts`          |
| `applyCTBOperations` dispatcher   | —                                                               | ✅ + 9 unit tests (rename, swap, delete bypass) |
| `schemaOperationsTool`            | ✅ `createSchemaOperationsTool.ts`                              | —                                               |
| Operation validator / simulator   | ✅ `validate-operations.ts` + 5 tests                           | —                                               |
| v2 route + prompts                | ✅ `POST /schemas/chat/v2` + operations prompts                 | —                                               |
| `OperationsProvider` + dispatcher | —                                                               | ✅ behind `STRAPI_AI_CTB_V2=true`               |
| v2 URL + version flag             | —                                                               | ✅ `STRAPI_AI_CHAT_URL_V2` + `ctbApiVersion: 2` |
| Client inference in `toCTB.ts`    | —                                                               | ✅ Gated when v2 enabled                        |
| E2E integration                   | ❌                                                              | ❌                                              |

---

## Phased rollout

| Phase | strapi-ai                                      | Strapi                                            | Done when                           |
| ----- | ---------------------------------------------- | ------------------------------------------------- | ----------------------------------- |
| **0** | Add `@ai/types` `ctb-operations.ts` + Zod      | Mirror types; `applyCTBOperations()` + unit tests | Types compile both sides            |
| **1** | Tool + validator + `/schemas/chat/v2`; keep v1 | `OperationsProvider` behind flag                  | Rename via AI → `renames[]` on save |
| **2** | Swap macro; DZ ops; prompt hardening           | Enable v2 by default                              | Multi-hop + component category      |
| **3** | Deprecate v1 prompts for new Strapi            | Remove `applyChange` AI path                      | v1 route kept for old Strapi        |

---

## Key file pointers

### Strapi monorepo

| Area                     | Path                                                               |
| ------------------------ | ------------------------------------------------------------------ |
| AI chat entry            | `packages/core/content-type-builder/admin/src/components/AIChat/`  |
| v1 apply path            | `…/AIChat/providers/SchemaProvider.tsx`                            |
| v1 transform             | `…/AIChat/lib/transforms/schemas/toCTB.ts`                         |
| Context → schemas (read) | `…/AIChat/lib/transforms/schemas/fromCTB.ts`                       |
| DataManager API          | `…/DataManager/DataManagerContext.ts`                              |
| Provider wiring          | `…/DataManager/DataManagerProvider.tsx`                            |
| Reducer + `recordRename` | `…/DataManager/reducer.ts`                                         |
| Save serialization       | `…/DataManager/utils/cleanData.ts`                                 |
| Rename modal             | `…/DataManager/RenameMigrationModal.tsx`                           |
| Server rename collect    | `packages/core/content-type-builder/server/src/services/schema.ts` |
| Migration builder        | `…/server/src/services/migration-builder/`                         |

### strapi-ai

| Area          | Path                                                    |
| ------------- | ------------------------------------------------------- |
| Chat route    | `apps/server/src/routes/schemas/chat.ts`                |
| Agent         | `packages/ai/architect/src/services/chat/chat-agent.ts` |
| v1 tool       | `…/tools/generateSchema/`                               |
| v1 validation | `…/validation/validate-schema.ts`                       |
| Shared types  | `packages/ai/types/src/`                                |

---

## Testing checklist (integration)

1. AI: "rename title to heading on Article" → one `editAttribute` op.
2. Apply ops in Strapi → inspect state: `renames: [{ oldName: 'title', newName: 'heading' }]`.
3. Save (prompt mode) → migration modal lists hop → accept.
4. Restart → column renamed, data preserved (`rename-migration.test.api.js` pattern).
5. Swap / chain cases from examples above.
6. v1 Strapi + v1 route still works (regression).

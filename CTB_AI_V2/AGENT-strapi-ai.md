# Agent brief — strapi-ai (v2 operations API)

> **Repo:** `github.com/strapi/strapi-ai` (local clone often at `../ai-server` relative to strapi monorepo).  
> **Read first:** [`HANDOFF.md`](HANDOFF.md) in strapi monorepo `CTB_AI_V2/`.  
> **Do not** change Strapi monorepo in this workstream except documenting the contract.

---

## Goal

Replace (or supplement) the v1 `schemaGenerationTool` snapshot flow with v2
`schemaOperationsTool` that returns an ordered `CTBOperation[]` matching Strapi CTB
`DataManager` public methods. Keep v1 working for backward compatibility.

---

## Done criteria

- [ ] `CTBOperation` union + Zod schemas in `packages/ai/types/src/ctb-operations.ts`, exported from `index.ts`
- [ ] `schemaOperationsTool` in `packages/ai/architect/src/services/chat/tools/generateOperations/`
- [ ] `operationValidator.validate(ops, previousSchemas)` applies ops sequentially against in-memory state; reuses existing attribute/schema validators where possible
- [ ] `POST /schemas/chat/v2` route (or `X-CTB-API-Version: 2` header on existing route — pick one, document in HANDOFF)
- [ ] `chat-agent.ts` registers v2 tool on v2 path; v1 unchanged on `/schemas/chat`
- [ ] Prompts teach op sequences (rename = `editAttribute`, swap = 3 hops, etc.) — new `makeCTBOperationsSystemPrompt.ts`
- [ ] Unit tests: rename, swap, chain+new field, invalid op rejected
- [ ] E2E test in `apps/server/src/test/e2e/` for v2 route returning valid operations stream
- [ ] Update `@ai/types` package comment / changelog noting Strapi mirror requirement

---

## Where to start

1. Read v1 tool: `packages/ai/architect/src/services/chat/tools/generateSchema/createSchemaGenerateTool.ts`
2. Read v1 validation: `packages/ai/architect/src/services/chat/validation/validate-schema.ts`
3. Read chat route: `apps/server/src/routes/schemas/chat.ts`
4. Read agent: `packages/ai/architect/src/services/chat/chat-agent.ts`

---

## Implementation guide

### 1. Types (`packages/ai/types`)

Create `ctb-operations.ts` per contract in `HANDOFF.md`. Export:

```typescript
export type CTBOperation = …;
export type CTBOperationsResult = { operations: CTBOperation[] };
```

Add Zod discriminated union in architect (not necessarily in types package if that
package stays TS-only — follow existing `schemas.ts` pattern).

### 2. New tool

`createSchemaOperationsTool.ts`:

```typescript
tool({
  description: 'Apply CTB admin operations (create/edit/remove schemas and fields).',
  inputSchema: z.object({ operations: z.array(ctbOperationSchema) }),
  execute: async ({ operations }) => {
    const result = await operationValidator.validate(operations, context.previousSchemas ?? []);
    if (!result.valid) return { error: result.error };
    return { operations: result.operations };
  },
});
```

Tool name for AI SDK: `schemaOperationsTool` → client part type `tool-schemaOperationsTool`.

### 3. Operation validator / simulator

New file: `validation/validate-operations.ts`

**Responsibilities:**

- Maintain mutable CTB-like state (content types + components map) seeded from `previousSchemas`
- For each op in order:
  - Verify preconditions (field exists for `editAttribute`, no duplicate names after rename, etc.)
  - Apply op to state (mirror reducer semantics — see Strapi `reducer.ts`)
  - Run existing validators on affected schemas
- Return validated ops unchanged (or expanded macros)

**Rename collision rule:** CTB never allows two fields with the same name at any instant. Validator must reject or expand invalid sequences.

**Optional macro (phase 2):** `swapFields` → expand to 3× `editAttribute` with generated `__ctb_swap_*` temp name.

**Reuse:** `attributeTypeValidator`, `relationTargetValidator`, `filterRemovedAttributesValidator` logic — but feed through op-applied state, not snapshot merge.

### 4. Route v2

`apps/server/src/routes/schemas/chat-v2.ts` (or extend `chat.ts`):

- Same auth/telemetry/limiting as v1
- Request schema adds `ctbApiVersion: z.literal(2).optional().default(2)`
- Call architect with flag to use operations tool
- Response headers unchanged (SSE)

Wire in `apps/server/src/server.ts` router mount: `/schemas/chat/v2`.

### 5. Prompts

- New `makeCTBOperationsSystemPrompt.ts` — replace snapshot-update examples with op examples from `HANDOFF.md`
- `makeIntroductionSystemPrompt.ts` — v2 branch references `schemaOperationsTool` not `schemaGenerationTool`
- Keep `makeStrapiSchemaDesignSystemPrompt.ts` for attribute type / relation rules (still valid as design reference)
- Add explicit section: **Renames are never snapshot diffs — always `editAttribute`**

### 6. Do NOT remove v1 yet

- `schemaGenerationTool` stays on `/schemas/chat`
- v2 is additive until Strapi client ships

---

## Test commands

```bash
# From strapi-ai repo root
yarn install
yarn test                    # unit
yarn test:e2e                # if configured — check package.json scripts
```

Add tests under:

- `packages/ai/architect/src/services/chat/validation/__tests__/validate-operations.test.ts`
- `packages/ai/architect/src/services/chat/tools/generateOperations/__tests__/`

---

## Contract for Strapi agent (coordinate via HANDOFF.md only)

Strapi client will:

1. `POST /schemas/chat/v2` with `ctbApiVersion: 2`
2. Parse `tool-schemaOperationsTool` parts
3. Call `applyCTBOperations(operations, dataManager)` in order

Your output shape:

```json
{ "operations": [ { "op": "editAttribute", … } ] }
```

No `schemas[]` in v2 tool output.

---

## Pitfalls

- **LLM emits full schemas in v2** — prompt must forbid; validator should reject unknown shapes
- **Bidirectional relations** — `addAttribute` on one side may require ops on target type (same as v1 atomic schema rule)
- **`previousSchemas` in context** — still sent by Strapi as read-only context; simulator seeds from this
- **prepareStep hook** in `chat-agent.ts` pushes v1 `schemas` from tool results — add parallel handling for operations or merge into schema state for multi-step chats

---

## Suggested branch name

`feat/ctb-operations-v2`

---

## References

- Strapi reducer semantics: `packages/core/content-type-builder/admin/src/components/DataManager/reducer.ts` (in strapi monorepo)
- v1 schema types: `packages/ai/types/src/schema.ts`

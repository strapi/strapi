# Orchestrator — CTB AI v2 (operations-based schema changes)

> **You are the lead agent.** Read this file, then manage parallel subagents for
> strapi-ai and the Strapi monorepo. Do not start coding until you have read the
> linked docs below.

---

## Mission

Ship **CTB AI v2**: strapi-ai returns an ordered list of **Content-Type Builder
admin operations**; the Strapi admin dispatches them **1:1** to `DataManager`;
rename migrations work through the **existing save pipeline** — no schema-snapshot
diffing, no client-side rename guessing.

```
strapi-ai  ──operations[]──►  OperationsProvider  ──DataManager.*()──►  reducer state
                                                                              │
                                                                         saveSchema()
                                                                              ▼
                                                                    rename migration file
```

**Do not** build a new server-side "operations → migration" layer. Operations →
`editAttribute` → `recordRename` → `renames[]` → `cleanData` →
`generateRenameMigrations` is the design (already implemented on this branch for
manual CTB edits).

---

## Read first (in order)

| #   | File                                                   | Why                                                                             |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 1   | [`CTB_RENAME_PROGRESS.md`](../CTB_RENAME_PROGRESS.md)  | Rename-migration feature status; AI v2 is the remaining gap                     |
| 2   | [`CTB_RENAME_PLAN.md`](../CTB_RENAME_PLAN.md)          | How renames flow admin → server → migration file                                |
| 3   | [`HANDOFF.md`](HANDOFF.md)                             | **Canonical v2 reference** — op catalog, wire contract, examples, file pointers |
| 4   | [`AGENT-strapi-ai.md`](AGENT-strapi-ai.md)             | Subagent brief — strapi-ai repo                                                 |
| 5   | [`AGENT-strapi-monorepo.md`](AGENT-strapi-monorepo.md) | Subagent brief — this repo                                                      |

Repo conventions: [`AGENTS.md`](../AGENTS.md) at monorepo root.

---

## Repos & branches

| Workstream            | Repo             | Path                           | Branch                               |
| --------------------- | ---------------- | ------------------------------ | ------------------------------------ |
| **Strapi CTB client** | strapi/strapi    | _this checkout_                | `feat/ctb-rename-migration-builder`  |
| **AI Server**         | strapi/strapi-ai | `../ai-server` (sibling clone) | `feat/ctb-operations-v2` from `main` |

**PR (Strapi):** https://github.com/strapi/strapi/pull/26749 (draft)  
**Linear:** CMS-635 (related CG-979, CG-1001)

---

## Orchestration

Launch **two subagents in parallel** after you have skimmed `HANDOFF.md`:

1. **strapi-ai** — point at [`AGENT-strapi-ai.md`](AGENT-strapi-ai.md) + `HANDOFF.md`
2. **Strapi monorepo** — point at [`AGENT-strapi-monorepo.md`](AGENT-strapi-monorepo.md) + `HANDOFF.md`

**Shared contract** (both sides must agree before Phase 1 integration):

- Tool name: `schemaOperationsTool`
- Client part type: `tool-schemaOperationsTool`
- Output: `{ operations: CTBOperation[] }`
- Each `op` = public `DataManager` method name (`createSchema`, `addAttribute`,
  `editAttribute`, `removeAttribute`, …)
- Full type union: [`HANDOFF.md` § Wire contract](HANDOFF.md#wire-contract)

**Phase plan:**

| Phase | strapi-ai                                  | Strapi                                            | Gate                                               |
| ----- | ------------------------------------------ | ------------------------------------------------- | -------------------------------------------------- |
| **0** | `@ai/types` `CTBOperation` + Zod           | Mirror types; `applyCTBOperations()` + unit tests | Types compile; dispatcher tests pass with fixtures |
| **1** | Tool + validator + `POST /schemas/chat/v2` | `OperationsProvider` + feature flag               | Rename op → `renames[]` in reducer state           |
| **2** | Prompts, swap macro, DZ ops                | Enable v2 URL; message UI markers                 | **Live E2E** (see below)                           |
| **3** | Deprecate v1 prompts for new Strapi        | Remove `applyChange` AI path                      | v1 route kept for old Strapi                       |

---

## AI Server — local build & run

Clone/path: **`../ai-server`** (`github.com/strapi/strapi-ai`).

Read that repo before running commands:

- `README.md`
- `docs/setup.md`
- `docs/development.md`
- `docs/environment-variables.md`

**Prerequisites:** Node 18+, **pnpm**, Docker (Postgres + MinIO).

```bash
cd ../ai-server
pnpm install
pnpm dev:db          # start Docker services
pnpm --filter @packages/database db:migrate
pnpm dev             # http://localhost:3001
```

**Verify:** `curl http://localhost:3001/_health`

**Useful scripts:**

| Command                 | Purpose                |
| ----------------------- | ---------------------- |
| `pnpm dev:mock:license` | Mock license registry  |
| `pnpm token:generate`   | Dev auth tokens        |
| `pnpm test`             | Vitest across packages |

Point Strapi at local AI Server (admin build reads this at compile time):

```bash
# from examples/getstarted (or your sandbox)
STRAPI_AI_URL=http://localhost:3001 yarn develop
```

Strapi resolves chat URL from `packages/core/content-type-builder/admin/src/components/AIChat/lib/constants.ts` (`STRAPI_AI_URL` + `/schemas/chat`; v2 adds `/schemas/chat/v2`).

---

## Strapi — local dev & tests

```bash
# monorepo root
yarn install && yarn setup   # if needed

# watch packages + sandbox (two terminals)
yarn watch
cd examples/getstarted && STRAPI_AI_URL=http://localhost:3001 yarn develop --watch-admin
```

**Quality gates (Strapi changes):**

```bash
yarn test:unit && yarn test:front && yarn test:ts && yarn lint && yarn prettier:check
yarn test:api rename-migration   # rename-migration feature still relevant
```

**Key client files** (Strapi subagent):

| File                                                                                          | Role                              |
| --------------------------------------------------------------------------------------------- | --------------------------------- |
| `packages/core/content-type-builder/admin/src/components/AIChat/providers/SchemaProvider.tsx` | v1 apply path — replace for v2    |
| `packages/core/content-type-builder/admin/src/components/DataManager/DataManagerContext.ts`   | Public API to call                |
| `packages/core/content-type-builder/admin/src/components/DataManager/reducer.ts`              | `recordRename` in `editAttribute` |
| `CTB_AI_V2/AGENT-strapi-monorepo.md`                                                          | Implementation checklist          |

**Key server files** (strapi-ai subagent):

| File                                                            | Role                     |
| --------------------------------------------------------------- | ------------------------ |
| `packages/ai/architect/src/services/chat/tools/generateSchema/` | v1 tool — reference only |
| `packages/ai/architect/src/services/chat/chat-agent.ts`         | Register v2 tool         |
| `apps/server/src/routes/schemas/chat.ts`                        | Add v2 route             |
| `CTB_AI_V2/AGENT-strapi-ai.md`                                  | Implementation checklist |

---

## Live E2E acceptance test

With **both** services running locally:

1. Open CTB AI chat in admin (EE + AI enabled).
2. Ask to rename a field on an existing type with data (e.g. `title` → `heading`).
3. **Assert state before save:** `renames: [{ oldName, newName }]` on the type (not `REMOVED` + `NEW`).
4. Save → rename migration modal (prompt mode) → accept hop.
5. Restart → column renamed, **data preserved**.

Repeat for a multi-hop case from [`HANDOFF.md` examples](HANDOFF.md#worked-examples) once swap/chain ops work.

---

## v1 context (what v2 replaces)

|           | v1 (today)                                     | v2 (target)                                  |
| --------- | ---------------------------------------------- | -------------------------------------------- |
| AI output | `tool-schemaGenerationTool` + schema snapshots | `tool-schemaOperationsTool` + `operations[]` |
| Client    | `transformChatToCTB` → `applyChange`           | `applyCTBOperations` → `DataManager.*()`     |
| Renames   | Lost unless guessed in `toCTB.ts`              | `editAttribute` → `recordRename`             |

Keep v1 working until v2 is shipped; gate v2 behind `STRAPI_AI_CTB_V2` or similar.

---

## Done criteria

- [ ] `CTBOperation` types in strapi-ai `@ai/types` and mirrored in Strapi
- [ ] strapi-ai: `schemaOperationsTool`, operation validator/simulator, `POST /schemas/chat/v2`, tests
- [ ] Strapi: `applyCTBOperations`, `OperationsProvider`, v2 URL + flag, tests
- [ ] Live E2E rename preserves data end-to-end
- [ ] `CTB_AI_V2/` + `CTB_RENAME_PROGRESS.md` updated with status

---

## Subagent launch prompts

**strapi-ai subagent:**

> Read `CTB_AI_V2/HANDOFF.md` and `CTB_AI_V2/AGENT-strapi-ai.md` in the strapi
> monorepo (path to this checkout). Implement the strapi-ai v2 work on branch
> `feat/ctb-operations-v2` in `../ai-server`.

**Strapi subagent:**

> Read `CTB_AI_V2/HANDOFF.md` and `CTB_AI_V2/AGENT-strapi-monorepo.md` in this
> repo on branch `feat/ctb-rename-migration-builder`. Implement the CTB client v2
> work.

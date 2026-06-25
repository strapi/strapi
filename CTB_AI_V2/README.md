# CTB AI v2 — Operations-Based Schema Changes

Handoff docs for replacing the v1 **schema snapshot** AI flow with a v2 **admin
operations** flow. The goal: strapi-ai returns ordered CTB `DataManager`
operations; the Strapi admin dispatches them 1:1; the existing rename-migration
save pipeline works without extra client inference.

## How to use (parallel agents)

**Orchestrator (recommended):** point one agent at [`AGENT-orchestrator.md`](AGENT-orchestrator.md) — it links everything below and describes how to run both repos locally for E2E.

Or open **two fresh agents** — one per repo:

| Repo                | Path                                                  | Kickoff brief                                          |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| **strapi-ai**       | `github.com/strapi/strapi-ai` (local: `../ai-server`) | [`AGENT-strapi-ai.md`](AGENT-strapi-ai.md)             |
| **strapi monorepo** | `github.com/strapi/strapi` (this repo)                | [`AGENT-strapi-monorepo.md`](AGENT-strapi-monorepo.md) |

Shared reference (all agents should read): [`HANDOFF.md`](HANDOFF.md)

## Dependency between workstreams

```
Phase 0 (parallel)     Phase 1 (parallel)              Phase 2 (integrate)
─────────────────     ─────────────────────           ───────────────────
@ai/types ops union   strapi-ai: tool + validator     E2E: Strapi ≥X + v2 URL
Strapi: mirror types  Strapi: OperationsProvider      Enable v2 by default
Strapi: dispatcher    strapi-ai: v2 route + prompts   Retire v1 AI path
```

**Contract boundary:** `CTBOperation[]` in tool output (`tool-schemaOperationsTool`).
Types are defined in strapi-ai `@ai/types` first; mirrored in Strapi until published.

## Related rename-migration docs

This work **complements** the rename-migration feature (already on
`feat/ctb-rename-migration-builder`):

- `CTB_RENAME_PROGRESS.md` — rename migrations status
- `CTB_RENAME_PLAN.md` — how `renames[]` flows admin → server → migration file

AI v2 fixes **how changes reach** `renames[]` (via `editAttribute` instead of
`applyChange`).

## Branch / tracking

- Strapi branch: `feat/ctb-rename-migration-builder` (base `develop`) or a child branch
- strapi-ai: branch from `main`
- Linear: CMS-635 (related CG-979, CG-1001)

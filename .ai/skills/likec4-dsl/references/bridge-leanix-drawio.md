# LeanIX bridge, Draw.io profile, and agent boundaries

This reference is for tasks that touch **LeanIX**, **Draw.io export**, or **bridge artifacts**. It complements `cli.md` and the main skill rules.

## Canonical source of truth

- **LikeC4 DSL** (`.c4` / `.likec4`) is canonical. The bridge derives LeanIX-shaped inventory and Draw.io annotations from the resolved model.
- **Agent Skills** teach DSL syntax and CLI contracts; they **do not** replace running `likec4 gen leanix …`, `likec4 sync leanix …`, or `likec4 export drawio --profile leanix`.

## CLI commands (first-class)

From the project root (see `@likec4/leanix-bridge` README for details):

| Goal                              | Command                                                                  |
| --------------------------------- | ------------------------------------------------------------------------ |
| Manifest + dry-run + report       | `likec4 gen leanix dry-run -o out/bridge`                                |
| Sync workflow (dry-run / plan)    | `likec4 sync leanix --dry-run -o out/bridge`                             |
| Apply sync to LeanIX API          | `likec4 sync leanix --apply -o out/bridge` (requires `LEANIX_API_TOKEN`) |
| Draw.io with bridge-managed cells | `likec4 export drawio --profile leanix -o ./diagrams`                    |

**Draw.io default profile** (`default`): no `bridgeManaged` / `likec4Id` in styles.

**Draw.io LeanIX profile** (`leanix`): adds `bridgeManaged=true`, `likec4Id`, `likec4Kind`, `likec4ViewId`, optional `likec4ProjectId` on vertices; `likec4RelationId` on edges — for round-trip and LeanIX alignment.

Other useful flags: `likec4 export drawio --roundtrip` (embed layout in DSL comments), `--all-in-one`, `--uncompressed`.

## Round-trip mental model

1. **Export** Draw.io with `--profile leanix` so cells carry stable LikeC4 identities.
2. **Parse** Draw.io back to DSL (`likec4` / generators): `likec4Id` on vertices and `likec4RelationId` on edges preserve FQN and relationship identity where the parser supports them (see `packages/generators` Draw.io tests).
3. **After LeanIX sync**, `manifestToDrawioLeanixMapping(manifest)` maps `likec4Id` ↔ LeanIX fact sheet / relation ids for re-export or tooling.

Do not invent bridge JSON shapes; generate them via the CLI or `@likec4/leanix-bridge` APIs documented in the package README.

## Mapping config (YAML / JSON)

Custom **LeanIX mapping** merges over defaults (`factSheetTypes`, `relationTypes`, `metadataToFields`). Invalid shapes (arrays instead of objects, non-string values, unknown top-level keys) are rejected with explicit errors when the config is normalized via `mergeWithDefault` / validation in `@likec4/leanix-bridge`.

## MCP vs bridge

- **MCP** (`likec4 mcp`, `@likec4/mcp`) exposes **read/query** tools over the LikeC4 workspace model (elements, views, relationships). It does **not** replace `likec4 gen leanix` or `likec4 sync leanix`.
- For LeanIX artifacts, Draw.io leanix profile, or manifest dry-run, use the **CLI** (or programmatic `@likec4/leanix-bridge`) as documented above.

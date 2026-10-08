---
name: likec4-dsl
description: Use when working with `.c4`/`.likec4` files or LikeC4 CLI/config questions where exact DSL/CLI syntax is required, especially for strict command/snippet-first answers, validate/export flags, predicates `*`/`_`/`**`, deployment snippets, dynamic views, or relationship extension matching.
---

# LikeC4 DSL Skill

Architecture-as-code tool. Describe systems in `.c4`/`.likec4` files and LikeC4 generates interactive diagrams.

## Rules

1. **Projects** - it is possible to have multiple likec4 projects in a workspace, project is determined by presence of a config file (`.likec4rc`, `likec4.config.{ts,js,json}`). LikeC4 files belong to the project of the nearest config file in the directory hierarchy.
2. **Top-level statements** — only `import`, `specification`, `model`, `deployment`, `views`, `global` are allowed. Blocks can repeat, but at least one per file must be present.
3. **Multi-file merge** — Top-level blocks across files are merged. For example, `model { ... }` blocks present in multiple files, parsed separately, and then merged into a single model.
4. **Strings** — `'single'`, `"double"` — all support multi-line. Escape quotes with backslash: `\'` or `\"`.
5. **Markdown** — properties like `summary`/`description`/`notes` can contain Markdown. Use triple quotes `'''` or `"""`. Begin a new line after opening quotes and indent Markdown content for better formatting and syntax highlighting.
6. **Comments** — `// single line` and `/* multi-line */` comments supported anywhere.
7. **Identifier** — letters, digits, hyphens, underscores only. No dots (dots are FQN separators). Can't start with a digit. Examples: `customer`, `payment-service`, `frontendApp`, `queue-1`. **Critical:** `payment-api` is valid; `payment.api` is NOT an identifier (dots separate FQN hierarchy). See `references/identifier-validity.md`.
8. **FQN** — Fully Qualified Name (FQN) is a dot-separated path to an element, MUST be unique within the project. Examples: `customer`, `saas.backend.payment-service.paymentsApi`, `infra.eu.zone1.node1`.
9. **References** — LikeC4 has lexical scoping with hoisting, nested scope may shadow outer, like in JavaScript. That scope does **not** carry across files: even with imports/includes in the same project, cross-file references must use full FQNs. Tiny reminder: `backend.api` does not survive a file boundary; across files write the full path such as `cloud.backend.api`.

## Response Discipline (critical for evals)

- If prompt says **"minimal"**, **"paste-ready"**, **"strict"**, **"exact"**, or requires a specific **first line**, output exactly **one final command/snippet/verdict token first** (no alternatives, no fallback variants, no extra preamble).
- Do **not** add unrequested `title`, labels, alternate snippets, or long explanations unless explicitly asked.
- Prefer exact requested tokens/phrases in the first line when the prompt requires strict phrasing.
- For strict command prompts, avoid ambiguous wording like "equivalent command" unless prompt explicitly asks for alternatives.
- If the task is snippet-first or command-first, a prose-only answer is a failure even if the explanation is knowledgeable.

## CLI Canonical Contracts (anti-substitution guardrails)

- Validate family: use `likec4 validate` (never substitute with `check`, `lint`, or `build`).
- Export family: use `likec4 export` (never substitute with other command families).
- Validation flags contract for strict evals: `--json --no-layout --file <path> ... <project-dir>`.
- Multi-file validation contract: repeat `--file` once per edited `.c4` / `.likec4` source file.
- Export output flags contract: prefer `--outdir` or `-o` (avoid invented aliases).

## Exact Syntax Guardrails (high-signal only)

### Deployment snippets

- If the prompt asks for **named deployment instances**, use `IDENTIFIER = instanceOf ELEMENT_ID`.
- Do **not** substitute anonymous `instanceOf ELEMENT_ID` lines when naming is required.
- If the prompt asks for a full fixture, keep the minimal executable structure: `specification`, `model`, `deployment`, and `views`.

### Relationship-extension matchers

- Relationship identity is matched by **source + target + kind (+ title when needed)**.
- If typed relationships exist, omitting `KIND` is wrong for strict disambiguation prompts.
- If multiple relationships share source/target/kind, include the title in the matcher.
- Do not "simplify" a typed matcher to `extend SOURCE -> TARGET ...` when the prompt is testing exact relationship identity.

Triage anchor when typed alternatives coexist:

```likec4
// Existing relationships
api -[async]-> queue "publishes"
api -[sync]-> queue "publishes"

// ✅ Correct: exact relationship selected
extend api -[async]-> queue "publishes" { metadata { retries "3" } }

// ⚠️ Ambiguous: kind omitted, async vs sync both match source/target/title family
extend api -> queue "publishes" { metadata { retries "3" } }

// ❌ Wrong: selects the other relationship
extend api -[sync]-> queue "publishes" { metadata { retries "3" } }
```

Compact ambiguity rule:

- **Ambiguous** — kind omitted while multiple typed relationships share the same source/target/title family and you are only explaining why the matcher is underspecified.
- **Wrong** — kind omitted when the task asks for the **final** matcher/snippet for a specific async/sync relationship.

## Workflow

1. (Required) Find existing or create new project config (section below). Directory with project config defines the scope for all LikeC4 files in that directory and subdirectories. Ask user if you are uncertain about the scope.
2. (Required) Find existing or create new `specification { ... }`, this enables what kinds of elements/deployments/relationships/tags you can use. See Specification section below.
3. Architecture elements and relationships are defined in `model { ... }` block. See Model section below.
4. Deployment topology is defined in `deployment { ... }` block. See Deployment section below.
5. Views (diagrams) are defined in `views { ... }` block. See Views section below.
6. After editing LikeC4 files, validate with the CLI

## Generate → Self-check → Finalize

For strict command/snippet prompts, keep a compact loop:

1. **Generate** only the requested final command/snippet.
2. **Self-check** quickly:

- exact command family / required flags / repeated `--file` count
- snippet-first or first-line contract satisfied
- predicate semantics (`*`, `_`, `**`) stated precisely
- scope / FQN correctness
- deployment naming requirement satisfied
- relationship matcher specificity (`kind`, `title` when needed)
- dynamic view exactness: return arrows, chain form, single parallel block when requested

3. **Finalize** by fixing in place (no extra alternatives unless explicitly requested).

Before final answer, verify the required tokens are literally present when the prompt depends on them (examples: `--no-layout`, `instanceOf`, `variant sequence`, `global predicate`, `-[async]->`, `parallel {`, `<-`).

Never claim CLI execution happened unless it actually ran.

## Validation

```bash
<runtime> likec4 validate --json --no-layout --file <edited-file> <project-dir>
```

Runtime launchers are equivalent for this command family:

```bash
npx likec4 validate --json --no-layout --file <edited-file> <project-dir>
bunx likec4 validate --json --no-layout --file <edited-file> <project-dir>
pnpm dlx likec4 validate --json --no-layout --file <edited-file> <project-dir>
```

- `--json` — structured output (stdout), logging goes to stderr
- `--no-layout` — skip layout drift checks (faster, only syntax+semantic)
- `--file <path>` — use with `--json` to scope results to the edited files. Without `--json`, text output still prints all diagnostics. Repeat once per edited source file.
- `<project-dir>` — path to the project directory
- There is **no** `likec4 check` command; use `likec4 validate`.

For evals/gradings/executions, be **runner-tolerant** (`npx`/`bunx`/`pnpm dlx`), and judge correctness by subcommand + flags + project scope.

If workspace already has `likec4` as a dependency, check its version from package.json and ensure it is at least 1.53.0. If pinning is needed, use the active runner (`npx`/`bunx`/`pnpm dlx`) with `likec4@1.53.0`.

Example output:

```json
{
  "valid": false,
  "errors": [
    {
      "message": "...",
      "file": "/abs/path.c4",
      "line": 5,
      "range": { "start": { "line": 5, "character": 2 }, "end": { "line": 5, "character": 20 } }
    }
  ],
  "stats": {
    "totalFiles": 100, // Total number of files in the project
    "totalErrors": 500, // Total number of errors in the project
    "filteredFiles": 1, // Number of files that match the --file filter
    "filteredErrors": 1 // Number of errors in the filtered files
  }
}
```

Broken specification/model in a large project can cascade into lots of errors across all files. Always use `--file` to focus on the files you edited. If `filteredErrors` is 0 but `totalErrors` is high, your files are clean but something else in the project is broken (not your problem). Selfcheck that `filteredFiles` matches the number of files you passed to `--file`.

Field semantics (must be explicit in answers):

- `filteredFiles`: count of files actually included by repeated `--file` filters
- `filteredErrors`: errors in the filtered subset only
- `totalErrors`: errors across the full project model

Example edge case: if you pass 3 files but one is `likec4.config.json`, `filteredFiles` may be `2` because config JSON is not a `.c4`/`.likec4` source file for DSL validation.

## Export PNG flags (precision)

Canonical output directory flags:

- `--outdir` (long form)
- `-o` (short form)

Do not invent flags like `--out-dir`. Depending on LikeC4 version, `--output` may appear as compatibility alias; prefer `--outdir`/`-o` for deterministic answers.

Full CLI reference → `references/cli.md`

## Canonical Snippets for High-Variance Families

Use these as exactness anchors when the prompt is testing syntax, not broad explanation.

### `predicateGroup` reusable predicate

```likec4
global {
  predicateGroup core-services {
    include cloud.* where kind is service
    exclude * where tag is #deprecated
  }
}

views {
  view service-overview {
    global predicate core-services
  }
}
```

### Deployment fixture with named instances

```likec4
deployment {
  vm appVm {
    primary = instanceOf cloud.api
    secondary = instanceOf cloud.api
  }
}
```

### Scoped include semantics

```likec4
views {
  view backend of cloud.backend {
    include *
    include -> cloud.backend
  }
}
```

Interpretation anchor: in a scoped view, `include *` means the scoped element plus its **direct children** as the base include set; neighbors can still appear through scoped relationship visibility.

### Deployment-view styling guardrail

For strict repair prompts about deployment views, the safe answer is **local `style ... {}` inside the deployment view**.

| Need                                   | Prefer                                                                    | Avoid as the answer                                               |
| -------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Style one deployment view              | `deployment view prod { include prod.** style prod._ { color primary } }` | `deployment view prod { include prod.** with { color primary } }` |
| Reuse styling in a deployment-view fix | local `style ... {}` rules in that deployment view                        | `global style theme`                                              |

Mini-reminder: in deployment views, treat `include ... with {}` and `global style ...` as unsupported repair patterns. Use a local `style ... {}` rule inside the deployment view instead.

## LikeC4 Project Configuration

Config file (`likec4.config.json`, `.likec4rc`, or `likec4.config.{ts,js}`) defines a project. Its location sets the project scope (LikeC4 files belong to the project of the nearest config file in the directory hierarchy).

```json
{
  "$schema": "https://likec4.dev/schemas/config.json",
  "name": "my-project",
  "title": "Project Title"
}
```

Key options: `name` (required, unique ID in the workspace), `title` (display name)
Full reference → `references/configuration.md`

## Specification

Defines all named vocabularies: element kinds, deployment node kinds, relationship kinds, tags, and custom color tokens. Must appear before those kinds are used in `model` or `deployment` blocks.

Key reminders: all definitions are global across files; duplicate kind/tag identifiers cause a validation error; specification changes trigger a full project re-parse — keep it in a dedicated `spec.c4` file.

Full syntax, options per kind, and worked example → `references/specification.md`

## Model

Hierarchical structure of elements and relationships. Elements have a kind (from specification), a unique identifier within their parent, and optional properties and nested elements.

Key reminders: `this`/`it` aliases the current element in nested relationships; cross-file references require full FQN; parent-child direct relationships are forbidden; `extend FQN { }` merges tags, metadata, and links into an existing element without redefining it.

Full syntax, extend patterns, property table, and worked example → `references/model.md`

## Style

Style properties control visual appearance: `color`, `shape`, `border`, `opacity`, `size`, `padding`, `textSize`, `icon`, `iconColor`, `iconSize`, `iconPosition`, `multiple`. Relationship style extends this with `line`, `head`, and `tail` arrow shapes.

Full color token table, all shape values, border/opacity/size tokens, icon pack prefixes (`aws:`, `azure:`, `gcp:`, `tech:`, `bootstrap:`), and correct usage patterns → `references/style-tokens-colors.md`

To discover available icons, use the CLI: `likec4 list-icons` (text, one per line). Filter by group with `--group <name>`. Icon groups and approximate counts: `aws` (~307), `azure` (~614), `gcp` (~216), `tech` (~2000), `bootstrap` (~2051) (see `references/cli.md` for details).

## Deployment

Maps logical model elements to physical infrastructure nodes using `instanceOf`. Uses `deploymentNode` kinds from specification. Inherits all logical model relationships automatically; additional deployment-level relationships can be defined inline.

Named vs. anonymous instances, multi-environment fixture, deployment relationships, and selection guidance → `references/deployment.md`

## Views

Three view types: element views (`view id` or `view id of element`), dynamic views (`dynamic view id`), deployment views (`deployment view id`). View properties: `title`, `description`, `metadata`, `link`.

Include/exclude predicates, view-level style rules, groups, `autoLayout`, `extends`, `navigateTo`, and global predicate groups → `references/views.md`

## Quick Decision Trees

### "I need incoming relationship predicates"

```text
Need inbound relation selection?
├─ From any source to target element → `include -> target`
├─ From explicit wildcard source     → `include * -> target`
└─ Include both directions around X  → `include -> X ->`
```

`include -> X` and `include * -> X` are related but not interchangeable in all contexts; prefer the exact form requested by user/eval.

### Scoped Predicate Truth Card (`*`, `_`, `**`)

| Selector    | One-line truth                                                                    | Typical use                         |
| ----------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| `parent.*`  | Direct children of `parent` only                                                  | Show immediate structure            |
| `parent._`  | Direct children of `parent` that have relationships with accumulated result       | Keep only connected direct children |
| `parent.**` | Recursive descendants of `parent` that have relationships with accumulated result | Explore connected deep descendants  |

Hard rule: do not describe `*` as recursive; do not describe `_` as wildcard-all; do not drop relationship-condition semantics for `_` / `**`.

### "I need to create a diagram/view or show a flow or sequence"

```text
What kind of diagram?
├─ Interaction flow / sequence → Dynamic View
├─ Infrastructure / deployment → Deployment View
├─ From architecture model → Element View
│   ├─ Primary element known → Scoped view: `view name of element { ... }`
│   └─ Extend existing view → `view name extends other { ... }`
└─ Other → `view name { ... }`
```

### "I need to style ..."

```text
Styling?
├─ Style element(s) in a view → view `style` rule, see `references/views.md`
├─ Style element(s) in some views, but not all
│   ├─ views in same file → local view rule, see `references/views.md`
│   └─ views in different files → global view rule, see `references/views.md`
├─ Style element globally → property inside element definition, see Model section
├─ Style all elements of a kind → property inside kind specification, see Specification section
├─ Style by tag → view rule, see `references/views.md`
├─ Style relationship(s) in a view → view rule, see `references/views.md`
├─ Style relationship globally → property inside relationship definition, see Model section
├─ Style all relationships of a kind → property inside kind specification, see Specification section
├─ Reuse same styles across views → see `references/views.md`
```

### "I need to organize across files"

```text
Multi-file project?
├─ Import elements → import { backend } from './shared.c4'
├─ Cross-file lookup → short names do not inherit lexical/container scope across files; use full FQN
├─ Extend element → extend cloud.backend { service newSvc "New" }
├─ Extend relationship → extend cloud -> amazon { metadata { ... } }
├─ Metadata merge → Duplicate keys become arrays
├─ Organize views → views "Use Cases" { ... } (folder label)
└─ All blocks are mergeable across files
```

### "I need to show a flow or sequence"

```text
Flow / sequence diagram?
├─ Basic steps → source -> target "title"
├─ Response / backward → source <- target "returns"
├─ Parallel actions → one `parallel { ... }` block (also: `par { ... }`)
├─ Chained steps → customer -> frontend "x" -> backend "y"
├─ Step with notes → step { notes 'Markdown content' }
├─ Link to another view → step { navigateTo other-view }
├─ Sequence variant → dynamic view name { variant sequence }
└─ Full reference → references/dynamic-views.md
```

Return-arrow precision:

- If the prompt asks for **response arrows back out**, prefer `<-` steps rather than replacing them with new forward arrows.
- If the prompt asks for a body on a specific hop in a chain, attach the block only to that hop.
- If the prompt asks for one fan-out, keep sibling actions in one `parallel { ... }` block instead of multiple one-step parallel blocks.

## Anti-Patterns to Avoid in Strict Prompts

| Anti-pattern                                                       | Why it fails                                   | Correct behavior                                          |
| ------------------------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------- |
| Substituting command families (`check`/`build`) for `validate`     | Breaks exact command contract                  | Keep `likec4 validate`                                    |
| Inventing/guessing flags                                           | Creates non-portable invalid commands          | Use canonical documented flags only                       |
| Multiple alternative snippets for one strict ask                   | Reduces precision; fails strict-output grading | Output one final answer unless alternatives are requested |
| Extending typed relationship without kind/title in ambiguous graph | Can target wrong relationship                  | Match with source + target + kind (+ title when needed)   |

## Common Mistakes & Debugging

When a model errors or an eval answer seems wrong, load `references/troubleshooting.md` which contains:

- **Syntax errors** — identifier format (dots forbidden in identifiers), unknown kinds, duplicate FQNs, malformed `where` predicates
- **Model & Hierarchy** — broken FQN references, parent-child relationship constraint, cross-file visibility
- **View Predicates** — `*` vs `**` confusion, missing neighbor elements, `WHERE` case sensitivity
- **Deployment** — `instanceOf` FQN resolution, undefined `deploymentNode` kinds
- **Dynamic Views** — flattening parallel blocks, response arrow symmetry, exact `variant sequence` keyword
- **Validation & Import** — config not found, import path resolution, upstream error cascade
- **Performance** — spec in separate file, splitting large views
- **5-step debugging workflow** — validation-first with `--file`, FQN integrity, predicate isolation, spec-first validation
- **7 Skill Best Practices** — response discipline, relationship disambiguation, FQN usage, safe editing rules

## Reference Index

Load a reference file when the task involves the corresponding topic. Claude reads SKILL.md first; these files are loaded on demand only when needed.

| File                                         | Purpose — load when...                                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `references/specification.md`                | Writing/editing `specification { }` blocks, defining element/deploymentNode/relationship/tag/color kinds        |
| `references/model.md`                        | Writing/editing `model { }` blocks, element hierarchy, relationships, `extend` patterns, property names         |
| `references/deployment.md`                   | Writing/editing `deployment { }` blocks, `instanceOf`, named instances, multi-environment topology              |
| `references/style-tokens-colors.md`          | Applying colors, shapes, icons, or relationship line styles; need exact token names                             |
| `references/views.md`                        | Writing views, include/exclude rules, style rules in views, groups, autoLayout, global predicates               |
| `references/predicates.md`                   | Complex `where` conditions, `with` overrides, global predicate groups, reusable predicates                      |
| `references/include-predicates-wildcards.md` | Wildcard confusion suspected (`*` vs `_` vs `**`); need exact scoped-view semantics                             |
| `references/dynamic-views.md`                | Writing dynamic views: steps, return arrows, chained steps, parallel blocks, `variant sequence`                 |
| `references/identifier-validity.md`          | Identifier vs FQN confusion; "dots in names" errors; understanding FQN construction                             |
| `references/relationships-bidirectional.md`  | Bidirectional relationship syntax and `<->` view predicate patterns                                             |
| `references/bridge-leanix-drawio.md`         | LeanIX bridge · `drawio --profile leanix` · round-trip · mapping · MCP vs bridge · sync/artifacts/managed cells |
| `references/cli.md`                          | Full CLI reference: serve, build, export, codegen, mcp, format; flag disambiguation                             |
| `references/configuration.md`                | Project config options, multi-project setup, include/exclude paths, generators                                  |
| `references/examples.md`                     | Compact real-world examples: extend, groups, globals, dynamic views, deployment, rank                           |
| `references/troubleshooting.md`              | Errors, unexpected output, eval failures — 6 error tables, 5-step debug workflow, 7 best practices              |

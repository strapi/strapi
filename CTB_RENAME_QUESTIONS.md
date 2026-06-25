# CTB Rename — Build Decisions (resolved)

Decisions made during the build, all now confirmed with Ben. Kept as a record so
the next person understands _why_ the implementation looks the way it does. None
of these are blocking; see `CTB_RENAME_PLAN.md` for the live status and remaining
work.

> Status legend: ✅ = decided/confirmed. (No 🟡 items remain.)

---

## 1. Config option default value ✅ (resolved — `prompt` / `always` / `never`)

The config option is `renameMigrations: 'prompt' | 'always' | 'never'`, default
`'prompt'`:

- `'always'`: always generate a migration without prompting the user.
- `'never'`: never generate a migration or prompt the user (legacy behaviour).
- `'prompt'` (default): open a modal asking whether to generate a migration for
  each change.

Server-side, `'always'` and `'prompt'` both generate for received renames; only
`'never'` skips generation. The `'prompt'` vs `'always'` distinction is enforced
purely on the admin side (whether to prompt before sending).

## 2. Payload shape for renames ✅ (resolved — ordered `renames[]` per type)

Each updated content-type / component carries an ordered
`renames: [{ oldName, newName }, …]` array: the **exact path of rename hops** the
user performed, in order. The server replays each hop verbatim.

This (vs. a collapsed per-attribute `oldName`) is what makes swaps work without
any synthetic temp column: the CTB forbids duplicate field names, so a swap is
necessarily performed by the user via an intermediate name (`a→tmp`, `b→a`,
`tmp→b`). Recording the path preserves that intermediate, so replay never hits a
collision. New fields (status `NEW`) are never tracked.

## 3. JS vs TS template emission ✅ (resolved — always JS)

Originally I emitted TS when `useTypescriptMigrations === true`. That was a
**data-loss bug**: the runner only globs `*.{js,sql}`
(`packages/core/database/src/migrations/users.ts`), and when
`useTypescriptMigrations` is enabled the migrations dir resolves to the
**compiled output** dir (`Strapi.ts`), so a `.ts` file written at runtime would
silently never run — renames would lose data on TS projects.

**Fix:** always emit a CommonJS `.js` migration. A plain `.js` migration is
picked up and executed by the runner in **both** JS and TS projects, so data is
always preserved. The TS template and language-selection code were removed.

## 4. Templating engine / builder ownership ✅ (resolved — DB file builder, CTB resolver)

The CTB no longer owns generic migration file rendering. The architecture is:

- `@strapi/database`: domain-agnostic migration file builder exposed as
  `strapi.db.migrations.createFileBuilder()`, with primitive operations
  (`renameColumn`, `renameTable`, `updateRows`), guarded JS rendering, configured
  migration-dir writes, millisecond timestamps, and collision suffixes.
- `@strapi/content-type-builder`: Strapi-domain rename resolver that maps
  content-type/component/relation/media rename intent into those primitive
  database operations.

No Handlebars dependency was added. The database file builder uses a tiny
internal renderer because the runtime template surface is intentionally small and
must stay coupled to the migration runner's JS-only contract.

## 5. Relation / component / media attribute renames ✅ (resolved — implemented)

**Attribute** renames now cover, using real v5 identifiers and guarded steps:

- scalar columns;
- single-owner relation **join columns** (`<field>_id`) → `renameColumn`;
- relation **join/link tables** (the backing table whose name encodes the owning
  attribute) → `renameTable`;
- **components & dynamic zones** (attribute name stored as a value in the per-type
  `_cmps` link table's `field` column) → guarded `updateRows`;
- **media** (attribute name stored in the shared `files_related_morphs` table,
  scoped by `related_type` = owning uid) → guarded `updateRows`.

The inverse side of a bidirectional relation is a no-op (the join table is named
from the owning side). **Polymorphic `morph*` relations are left unsupported**
(reported via `getUnsupported()`; `schema.ts` logs a warning) — they aren't
creatable through the CTB UI anyway.

**Component-_level_ renames are now also covered** (CG-1001): moving a component
to a new category changes its uid, and the builder exposes
`addRenameComponent({ oldUid, newUid })`, which migrates the `component_type`
value in every `*_cmps` link table that references it. The component's own data
table keeps its `collectionName` (the CTB never renames it), so no table rename
is required.

**Out of scope by design:** renaming a **content-type** (its table / uid). The
CTB cannot change a content type's `collectionName` or `uid` — `editContentType`
only edits `displayName`/`kind`/options — so a content-type rename is purely
cosmetic and has nothing to migrate.

## 6. Migration filename timestamp precision ✅ (resolved — millisecond + collision suffix)

Auto-generated migrations use **millisecond** precision
(`2026.06.11T15.39.50.123.rename-fields.js`). The CLI generator's second
precision collided when several saves land in the same second (Umzug skipped the
second file → silent data loss; caught by the API integration test). The writer
also appends `-1`, `-2`, … if a same-named file already exists. This logic now
lives in the generic database file builder
(`packages/core/database/src/migrations/file-builder.ts`).

## 7. Index renaming ✅ (resolved for MVP — deferred to schema-sync)

The generated migration does **not** rename indexes; schema-sync rebuilds them
after the column/table rename. Revisit only if sync churn or index-name drift
becomes a real problem (see plan "Schema-sync interaction").

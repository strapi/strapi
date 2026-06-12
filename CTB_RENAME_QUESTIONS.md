# CTB Rename — Open Questions for Ben

Small decisions made during the build that I'd like you to confirm. I picked a
reasonable default for each (marked **[assumed]**) and kept going; flag any you
want changed.

> Status legend: 🟡 = awaiting your confirmation. Nothing here blocked progress.

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

## 5. Relation / join-table renames 🟡

MVP covers **scalar attribute** column renames (incl. v5 long-name hashing) and
single-owner relation **join columns**. Renaming the _backing join table_ of a
many-to-many, and component/dynamic-zone specifics (CG-979/CG-1001), are stubbed
with TODOs and guarded.

**[assumed]** Scalar + join-column for MVP; join-table / component-attr renames
as a fast follow. OK?

## 6. Migration filename timestamp precision 🟡

The CLI migration generator uses second precision (`2026.06.11T15.39.50`). For
auto-generated rename migrations I use **millisecond** precision
(`...50.123.rename-fields.js`) because multiple saves can occur within the same
second and second-precision names collided (Umzug skipped the second one →
silent data loss; caught by the API integration test). `writeFiles` also appends
`-1`, `-2`, … if a same-named file already exists.

**[assumed]** Millisecond precision + collision suffix. OK?

## 7. Index renaming 🟡

I do **not** rename indexes in the generated migration for MVP; I let schema-sync
rebuild them. Open item in the plan (§6).

**[assumed]** Leave index handling to sync for now. OK?

---

_Resolved questions will be moved below this line._

# Dead Dependencies Analysis — Yarn Catalog Refactoring

> Branch: `cursor/yarn-catalog-dead-dependencies-60e9`
> Date: 2026-03-03
> Context: Strapi monorepo uses Yarn 4.12.0 with `node-modules` linker. Catalog started with `vitest: ^4.0.18`.

---

## Approach

Instead of removing deps that were "dead" due to `run -T` indirection, the chosen fix is:

1. **Remove the `-T` flag** from all `tsc` and `rimraf` script invocations so each package uses its own declared dep.
2. **Add the dep to each package** that was missing it, using a `catalog:` reference.
3. **Add to the yarn catalog** so the version is declared once and shared.

This makes each package self-contained and removes the implicit reliance on the root workspace for tool resolution.

---

## Catalog — Before / After

```yaml
# .yarnrc.yml — after
catalog:
  rimraf: 5.0.5
  typescript: 5.4.4
  vitest: ^4.0.18
```

---

## Changes Applied

### `typescript` — 35 packages

`run -T tsc` → `tsc` in all scripts. `typescript: "catalog:"` added or updated in `devDependencies`.

Packages that **already had** `typescript` (version changed to `catalog:`):
`@strapi/content-releases`, `@strapi/plugin-cloud`, `@strapi/plugin-color-picker`, `@strapi/plugin-graphql`, `@strapi/types`, `@strapi/data-transfer`

Packages that **gained** `typescript: "catalog:"` (were relying silently on `run -T`):
`@strapi/generators`, `@strapi/provider-upload-aws-s3`, `@strapi/provider-upload-local`, `@strapi/provider-email-amazon-ses`, `@strapi/provider-email-mailgun`, `@strapi/provider-email-nodemailer`, `@strapi/provider-email-sendmail`, `@strapi/provider-email-sendgrid`, `@strapi/provider-upload-cloudinary`, `create-strapi-app`, `@strapi/cloud-cli`, `@strapi/admin-test-utils`, `@strapi/plugin-documentation`, `@strapi/plugin-sentry`, `@strapi/i18n`, `@strapi/plugin-users-permissions`, `@strapi/openapi`, `@strapi/content-type-builder`, `@strapi/strapi`, `@strapi/database`, `@strapi/email`, `@strapi/upload`, `@strapi/permissions`, `@strapi/admin`, `@strapi/content-manager`, `@strapi/core`, `@strapi/review-workflows`, `@strapi/utils`, `@strapi/upgrade`, `@strapi/logger`

---

### `rimraf` — 33 packages

`run -T rimraf` → `rimraf` in all `clean` scripts. `rimraf: "catalog:"` added or updated.

`@strapi/data-transfer` already called `rimraf` directly (no `run -T`) — its version was updated to `catalog:`.
`@strapi/upgrade` called `run -T rimraf` and already had `rimraf: "5.0.5"` — flag removed, version updated to `catalog:`.
All other 31 packages only used `run -T rimraf` without declaring the dep — flag removed, dep added as `catalog:`.

---

### Root `package.json`

```diff
- "rimraf": "5.0.5",
+ "rimraf": "catalog:",

- "typescript": "5.4.4",
+ "typescript": "catalog:",
```

---

## Still Pending (Requires Human Decision)

### `cross-env` in `@strapi/plugin-graphql` — confirmed dead
Listed in `devDependencies`, absent from all scripts and source files. Safe to remove.

### `@strapi/ts-zen` in 3 packages — confirmed dead
Present in `@strapi/core`, `@strapi/strapi`, `@strapi/types` devDeps. Not referenced in any tsconfig, source, or script. Package not found in `node_modules`.

> TODO @Nico [Verify with team if @strapi/ts-zen was a planned/experimental TypeScript plugin. Remove if confirmed unused.]

### `react-query` in 3 packages — likely dead
`@strapi/content-releases`, `@strapi/content-type-builder`, `@strapi/i18n` list `react-query: 3.39.3` but no direct imports found. Available transitively via `@strapi/admin-test-utils`.

> TODO @Nico [Confirm tests don't depend on explicit version pinning. Remove if safe.]

### `lodash` (runtime) in `@strapi/types` — likely wrong package
Only type imports used (`import type { PropertyPath } from 'lodash'`). Should be `@types/lodash`, not the runtime `lodash`.

> TODO @Nico [Replace `lodash` → `@types/lodash` in `packages/core/types/package.json`.]

---

## Next Catalog Candidates

With `typescript` and `rimraf` now in the catalog, natural next candidates following the same pattern:

| Dep | Packages | Notes |
|---|---|---|
| `jest` | ~35 packages | All run `jest` directly after `run -T` removal follows same pattern |
| `@swc/jest` | root + `@strapi/core` | Transform used by all jest configs via root preset |
| `eslint` | ~30 packages | Via `run -T eslint` |
| `rollup` | ~30 packages | Via `run -T rollup` |

# Dead Dependencies Analysis — Yarn Catalog Refactoring

> Branch: `cursor/yarn-catalog-dead-dependencies-60e9`
> Date: 2026-03-03
> Context: Strapi monorepo uses Yarn 4.12.0 with `node-modules` linker. Catalog currently tracks only `vitest: ^4.0.18`.

---

## Methodology

1. Extracted `devDependencies` from all 42 workspace packages under `packages/`
2. For each dep, verified usage via:
   - **Scripts**: does the package call the binary directly or via `run -T` (workspace root tool)?
   - **Source imports**: is the package imported in `.ts` / `.tsx` source files?
   - **Config files**: is it referenced in `tsconfig.json`, `jest.config.js`, etc.?

**Key rule for `run -T <cmd>`**: Yarn Berry's `run -T` resolves the binary from the _root_ workspace, not the package's own `node_modules`. A package that only calls `run -T tsc` does NOT need `typescript` in its own `devDependencies` — the root already has it.

---

## Confirmed Dead Dependencies

### 1. `typescript` — 6 packages

All six packages have `typescript` in `devDependencies` but only invoke `tsc` via `run -T tsc` (root workspace binary). No programmatic `import ... from 'typescript'` found anywhere.

| Package | File |
|---|---|
| `@strapi/content-releases` | `packages/core/content-releases/package.json` |
| `@strapi/plugin-cloud` | `packages/plugins/cloud/package.json` |
| `@strapi/plugin-color-picker` | `packages/plugins/color-picker/package.json` |
| `@strapi/plugin-graphql` | `packages/plugins/graphql/package.json` |
| `@strapi/types` | `packages/core/types/package.json` |
| `@strapi/data-transfer` | `packages/core/data-transfer/package.json` |

Evidence (all clean scripts / tsc calls):
```
"build:types": "run -T tsc -p tsconfig.build.json --emitDeclarationOnly"
"test:ts":     "run -T tsc --noEmit"
```

Root `package.json` has `typescript: 5.4.4` in `devDependencies` → available to all packages via `run -T`.

---

### 2. `rimraf` — 1 package

`@strapi/upgrade` has `rimraf` in `devDependencies` but calls it via `run -T rimraf ./dist`. No programmatic usage. Root has `rimraf: 5.0.5`.

| Package | File | Script |
|---|---|---|
| `@strapi/upgrade` | `packages/utils/upgrade/package.json` | `"clean": "run -T rimraf ./dist"` |

> **Note**: `@strapi/data-transfer` calls `"clean": "rimraf ./dist"` (direct, no `run -T`) — its `rimraf` devDep is **alive**.

---

### 3. `cross-env` — 1 package

`@strapi/plugin-graphql` lists `cross-env: ^7.0.3` in `devDependencies`. It does not appear in any script, source file, or config file.

| Package | File |
|---|---|
| `@strapi/plugin-graphql` | `packages/plugins/graphql/package.json` |

---

### 4. `@strapi/ts-zen` — 3 packages

`@strapi/ts-zen: ^0.2.0` appears in 3 packages' devDependencies but is referenced **nowhere**: no `import`, no tsconfig `plugins` array, no script invocation. The package does not appear in `node_modules`.

| Package | File |
|---|---|
| `@strapi/core` | `packages/core/core/package.json` |
| `@strapi/strapi` | `packages/core/strapi/package.json` |
| `@strapi/types` | `packages/core/types/package.json` |

> TODO @Nico [Verify with team if @strapi/ts-zen was a planned/experimental TypeScript plugin that never landed. If so, remove from all 3 packages.]

---

## Likely Dead (Lower Confidence)

### 5. `react-query` — 3 packages

These packages list `react-query: 3.39.3` in `devDependencies` but no direct `from 'react-query'` imports exist in source or test files. `react-query` is already a production dep of `@strapi/admin-test-utils` (which these packages use for tests), so it is available transitively.

| Package | File |
|---|---|
| `@strapi/content-releases` | `packages/core/content-releases/package.json` |
| `@strapi/content-type-builder` | `packages/core/content-type-builder/package.json` |
| `@strapi/i18n` | `packages/plugins/i18n/package.json` |

> TODO @Nico [Confirm tests don't rely on react-query being explicitly listed (e.g., for version pinning via moduleNameMapper). If not, remove.]

---

### 6. `lodash` (runtime) in `@strapi/types`

`packages/core/types` lists `lodash` (runtime) in devDeps but only uses type imports:

```ts
// packages/core/types/src/core/strapi.ts
import type { PropertyPath } from 'lodash';
```

Types for lodash come from `@types/lodash`, not the `lodash` runtime. `@types/lodash` is hoisted from other packages (e.g., `@strapi/core`, `@strapi/admin`), so TypeScript compilation works today. But the explicit `lodash` devDep in `@strapi/types` is wrong — it should be `@types/lodash` (or rely on the workspace hoist).

> TODO @Nico [Replace `lodash` → `@types/lodash` in `packages/core/types/package.json`, or explicitly add `@types/lodash` to make the type dependency self-contained.]

---

## Summary Table

| Dep | Affected Packages | Confidence | Action |
|---|---|---|---|
| `typescript` | 6 packages | ✅ Confirmed dead | Remove |
| `rimraf` | `@strapi/upgrade` | ✅ Confirmed dead | Remove |
| `cross-env` | `@strapi/plugin-graphql` | ✅ Confirmed dead | Remove |
| `@strapi/ts-zen` | 3 packages | ✅ Confirmed dead | Verify + Remove |
| `react-query` | 3 packages | ⚠️ Likely dead | Verify + Remove |
| `lodash` → `@types/lodash` | `@strapi/types` | ⚠️ Likely wrong pkg | Replace |

**Total confirmed removals: 11 devDependency entries across 9 packages.**

---

## Catalog Opportunity (Next Step)

Once dead deps are cleaned, the catalog can be expanded with high-value shared devDeps:

- `typescript` — currently in root `devDependencies`, used by all packages via `run -T tsc`
- `rimraf` — same pattern as typescript
- `jest` / `@swc/jest` — used by ~35 packages via jest configs that extend root presets
- `@testing-library/react`, `msw`, `styled-components` — appear across 10+ packages

These are good candidates for the catalog after the dead dep cleanup.

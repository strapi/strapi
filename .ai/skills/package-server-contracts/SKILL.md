---
name: package-server-contracts
description: Use when adding or changing a service, controller, policy, or config contract of a Strapi monorepo package, when a server package looks up another package, when a strict lookup resolves to `unknown`, when editing `server/src/types/` registry declarations or a `server/src/registries.ts` file, or when changing `types` or `paths` in a server tsconfig.
---

# Package server contracts

Source of truth: [TypeScript guide](../../../docs/docs/guides/03-typescript.md). Server packages type-check in strict mode: `packages/utils/tsconfig/server.json` loads only the switch, `@strapi/types/strict`.

## Declaring a package's contracts

```ts
// server/src/types/index.ts
declare global {
  namespace Strapi {
    namespace Registries {
      interface PackageServices {
        'plugin::i18n.locales': ServiceContracts.LocaleService;
      }
    }
  }
}
```

- Declare in `PackageServices`, `PackageControllers`, `PackagePolicies`, or `PackageConfigs`. `App*` registries belong to applications.
- Re-export from the server entry with `export type * from './types'`, and map `strapi-server` in `typesVersions` when the package has an `exports` map.
- Never augment `Strapi.Registries.Settings` in published source.
- Check the implementation against its contract with an annotation or `satisfies`.
- One contract per UID. Conflicts fail with TS2717.
- A bundled package that registers contracts must also be imported by `packages/core/strapi/strict-types.d.ts`.
- EE code that merges members into admin services passes `EnterpriseServices` as an explicit type argument.
- Config: the input type (what `config/*.ts` contains) lives in `@strapi/types` (`Core.Config.*`). The resolved contract (`Resolved*`, loader defaults required) lives in the package that applies the defaults and is what `PackageConfigs` registers. JSDoc on each links to the other. Core namespaces: one file each in `packages/core/core/src/types/config/`.

## Consuming another package's contracts

A package's own contracts come from its `src/`. Contracts of other packages come from `server/src/registries.ts`:

```ts
// Contracts of the packages this package looks up. Each import must be a declared dependency.
import type {} from '@strapi/admin/strapi-server';
```

- A lookup of another package resolves to `unknown`: add that package's `strapi-server` import to `registries.ts`. Do not add a type argument or a cast to work around it.
- Import only packages in `dependencies` or `peerDependencies`. Oxlint rule `strapi-registries/declared-dependencies` enforces it. If the package is missing, declare it first.
- `packages/core/*` imports each provider's `strapi-server` entry. `packages/plugins/*` that depend on `@strapi/strapi` may import `@strapi/strapi/strict-types`.
- Keep `registries.ts` a `.ts` file. A `.d.ts` file hides TS2307 under `skipLibCheck`, and the registry becomes silently empty.
- Never add `@strapi/strapi/strict-types` to a shared tsconfig preset, and never map a package's own `strapi-server` with `paths`. Both make a package read its own `dist/` (TS5055) or depend on packages Nx does not build first.

## Verify

```bash
node_modules/.bin/tsc -p <package>/server/tsconfig.json --noEmit
node_modules/.bin/oxlint --format json --config packages/utils/oxlint-config/oxlint.config.ts <package>/server/src/registries.ts
yarn test:types:registries   # after building the changed packages
```

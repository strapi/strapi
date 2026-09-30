---
title: TypeScript
---

This guide covers how the monorepo's server packages use registered contracts. Strapi packages
publish service, controller, policy, and config contracts through the global `Strapi.Registries`
namespace. Contracts only change lookup types in strict mode, which applications enable with the
`@strapi/strapi/strict-types` entry. Without strict mode, the `@strapi/types` and `@strapi/strapi`
types must stay those of the previous release.

## Strict mode in the monorepo

Strapi's server packages type-check in strict mode. The shared `tsconfig/server.json` preset
loads only the switch, `@strapi/types/strict`. It does not load `@strapi/strapi/strict-types`,
which is the application entry. No published source imports the switch.

A package's own contracts come from its `src/` directory. A package that looks up another
package's services, controllers, policies, or config loads that package's contracts from
`server/src/registries.ts`:

```ts
// packages/core/content-releases/server/src/registries.ts
// Contracts of the packages this package looks up. Each import must be a declared dependency.
import type {} from '@strapi/admin/strapi-server';
import type {} from '@strapi/content-manager/strapi-server';
```

This file makes each package's program follow its dependency graph. Nx builds a package's
dependencies before the package, so `yarn build`, `yarn test:ts`, and cached Nx results check
the same contracts. Follow these rules:

- Import only packages listed in `dependencies` or `peerDependencies`. The Oxlint rule
  `strapi-registries/declared-dependencies` enforces this. An undeclared package still resolves
  through workspace hoisting, but Nx does not build it first, so the result depends on the state
  of its `dist/`.
- Packages under `packages/core/` import each provider's `strapi-server` entry. Packages under
  `packages/plugins/` that depend on `@strapi/strapi` can import `@strapi/strapi/strict-types`,
  as an application does.
- Keep the file a `.ts` source file. A missing provider declaration then fails with TS2307. In a
  `.d.ts` file, `skipLibCheck` hides that error and the registry is silently empty.
- Do not map a package's own `strapi-server` entry with `paths`. The package already includes its
  contracts from `src/`, and loading its own `dist/` fails with TS5055.
- When code starts to look up a package that is not in the file yet, add the import. Without it,
  the lookup resolves to `unknown`.

Declaration emit erases these imports, so the file publishes nothing. Applications load the same
contracts through `@strapi/strapi/strict-types` or generated types.

## Declaring a package's contracts

Keep contracts in the package that implements them, under `server/src/types/`, and declare them
in the `Package*` registries: `PackageServices`, `PackageControllers`, `PackagePolicies`, and
`PackageConfigs`. The `App*` registries belong to applications.

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

- Re-export the module from the server entry with `export type * from './types'`. The emitted
  `strapi-server` declaration must keep that re-export, because it is what `registries.ts` files,
  `@strapi/strapi/strict-types`, and generated application types load.
- Packages with an `exports` map also map `strapi-server` in `typesVersions`, for consumers
  that use the legacy `Node` module resolution.
- Do not augment `Strapi.Registries.Settings` in published source. Only `@strapi/types/strict`
  sets the switch.
- Check implementations against their contracts with a type annotation or `satisfies`.
- Declare one contract per UID. Conflicting `Package*` declarations fail with TS2717, and
  `skipLibCheck` can hide the conflict in a consumer.
- A package bundled with `@strapi/strapi` that registers contracts must also be imported by
  `packages/core/strapi/strict-types.d.ts`.
- EE code that merges members into admin services passes the EE shape, `EnterpriseServices`, as an
  explicit type argument. The registered contract is the CE shape with the EE-only members
  optional.

## Keeping types unchanged without strict mode

A type in `@strapi/types` or `@strapi/strapi` that behaves differently in strict mode resolves
both shapes from `IsStrict` (`packages/core/types/src/core/strictness.ts`):

```ts
type Lookup = IsStrict extends false ? LegacyLookup : StrictLookup;
```

The legacy shape is the previous release's type, copied as is. The strict-off parity fixtures in
`tests/types/registries/fixtures/parity-*.ts` pin that shape: they must compile against both the
current code and the previous release. `tests/types/registries/consumer.test.cjs` compiles them.

## Verifying changes

Build changed packages before running `yarn test:ts`, because consumers use emitted declarations.
`yarn test:types:registries` runs the published-contract tests separately. They check Bundler,
Node, and NodeNext resolution, both switch states, declaration order, application overrides,
editor completions, and accidental publication of strict activation. CI runs these checks
after the monorepo build.

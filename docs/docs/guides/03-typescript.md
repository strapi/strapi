---
title: TypeScript
---

## Registered contracts

Strapi packages can publish service, configuration, controller, and policy contracts through
`Strapi.Registries`. Loading these contracts does not change an application's lookup types.
Applications enable them with one import in a declaration file included by their tsconfig:

```ts
// types/strict.d.ts
import type {} from '@strapi/strapi/strict-types';
```

This types-only entry enables contracts across the TypeScript program and loads the bundled
admin, content-manager, and i18n contracts. It changes no runtime behavior. The ordinary
`@strapi/strapi` entry and new application templates leave strict mode disabled.

Alternatively, append the entry to `compilerOptions.types`:

```json
{
  "compilerOptions": {
    "types": ["node", "@strapi/strapi/strict-types"]
  }
}
```

Keep existing entries: this option replaces automatic inclusion of ambient type packages and
does not merge arrays from an extended tsconfig.

Run `strapi ts:generate-types` to load optional plugins' contracts. Generation also runs during
`strapi develop`. The generated `types/generated/plugins.d.ts` imports the normal server types
of enabled plugins with resolvable server declaration files. Include the generated directory
in your app's tsconfig. Plugins without server declarations are skipped. Regenerate after changing
plugin configuration or dependencies; removed plugins' references are removed from the file.
These generated imports do not enable strict mode on their own.

Strapi's participating server packages use the lower-level `@strapi/types/strict` entry in
their own tsconfigs. They do not depend on the application entry or import activation from
their published source. Both entries enable the same `Strapi.Registries.Settings.strict`
type setting.

With strict contracts enabled, registered literal names resolve to their contracts:

```ts
const locales = strapi.plugin('i18n').service('locales');
const defaultLocale = await locales.getDefaultLocale(); // string | null
```

The bundled contracts cover i18n's services and controllers, including the possibility of missing
settings, locales, and AI localization jobs. Content Manager registers its core controllers,
permission policy, and services for content structure, document operations and metadata, field
sizes, metrics, population, and UID generation. Its other services and feature-specific
controllers retain the existing fallback types.

Unregistered or dynamic names retain permissive lookup types. Explicit generic arguments on
plugin lookups and config getters remain available. Dotted config paths resolve within the
registered contract, including optional properties and array elements. Array paths and unknown
paths retain the generic fallback. For registered paths, a defined default removes `undefined`
from the result. A default that can itself be `undefined` preserves that possibility. Defaults
do not replace `null`.

Without `Settings.strict: true`, service, controller, config, and policy lookups keep their
previous types, even if the program loads package contracts or application overrides. Editors
can still suggest registered names.

## Publishing a plugin's contracts

Keep contracts in the package that implements them, under `server/src/types/`. Declare package
defaults in `server/src/types/index.ts` and re-export that module from the normal server entry:

```ts
// server/src/types/index.ts
export type GreetingService = {
  greet(name: string): Promise<string>;
};

declare global {
  namespace Strapi {
    namespace Registries {
      interface PackageServices {
        'plugin::greetings.greeting': GreetingService;
      }
    }
  }
}
```

```ts
// server/src/index.ts
export type * from './types';
```

Use `PackageConfigs` for configuration namespaces such as `plugin::greetings`,
`PackageControllers` for full controller UIDs, and `PackagePolicies` for full policy UIDs.
Each policy entry describes its configuration, or `undefined` if it accepts none.
Check implementations against their contracts with a type annotation or `satisfies`.
Declare packages referenced by published contracts as dependencies.

The emitted server entry must retain the re-export so consumer programs load the declarations.
An unused `import type {}` in a source file is erased during declaration emit and cannot provide
this guarantee. Do not publish an augmentation of `Settings` through the server entry.
Packages with an `exports` map also need a `typesVersions` mapping for `strapi-server` if they
support the legacy `Node` module resolution mode.

Applications use `AppServices`, `AppConfigs`, `AppControllers`, and `AppPolicies` to add their own
contracts or replace package contracts. Each application entry replaces the whole package contract
for its key. Strapi and plugin packages contribute to the corresponding `Package*` registries.
Use one package contract version per UID per program. Conflicting `Package*` declarations fail
with TS2717 even with strict contracts disabled. `skipLibCheck` hides the conflict and can make
the selected contract depend on declaration order.

## Checking routes

Use `Core.RouterInputFor<typeof controllers, 'plugin::greetings'>` to check string handlers
against a controller map. It accepts controller objects and factories, with relative handlers
such as `greeting.hello` and absolute handlers such as `plugin::greetings.greeting.hello`.
Preserve literal controller keys; a map typed as `Record<string, ...>` cannot detect name typos.
Handler checking applies whenever this explicit type is used, including with the switch off.

With the switch on, typed route policies use the loaded policy registry. Once any policy is
registered, all referenced policies must be registered. Load every relevant provider and add
application policies, including `global::` policies, to `Strapi.Registries.AppPolicies`.
The generator loads enabled plugins' contracts; application policies still need their own
declarations. Policies with required config must use `{ name, config }`; only policies whose
config accepts `undefined` can be referenced by name alone. Existing untyped `Core.RouteConfig`
remains permissive.

Pass the plugin or API namespace to the router type to check relative policy names as well:
`Core.RouterInputFor<typeof controllers, 'plugin::greetings'>` checks `isOwner` against
`plugin::greetings.isOwner`. Fully qualified policy names remain available. An exact registered
name takes precedence over a relative match, as it does at runtime. Admin and global policies
use their fully qualified names.

Policy inventories are deliberately complete for explicitly typed routes: accepting arbitrary
policy names would also let an invalid configuration for a known policy pass through the
fallback. Services and controllers can adopt contracts incrementally because their lookups
resolve one name at a time.

## Verifying changes

Build changed packages before running `yarn test:ts`, because consumers use emitted declarations.
`yarn test:types:registries` runs the published-contract tests separately. They check Bundler,
Node, and NodeNext resolution, both switch states, declaration order, application overrides,
editor completions, and accidental publication of strict activation. CI runs these checks
after the monorepo build.

---
title: TypeScript
---

## Registered contracts

Strapi packages can publish service, configuration, controller, and policy contracts through
`Strapi.Registries`. Loading these contracts does not change an application's lookup types.
Applications enable them with a single setting in a declaration file included by their tsconfig:

```ts
// types/strict.d.ts
import type {} from '@strapi/i18n/strapi-server';
import type {} from '@strapi/admin/strapi-server';

declare global {
  namespace Strapi {
    namespace Registries {
      interface Settings {
        strict: true;
      }
    }
  }
}
```

Load the normal server types of each plugin whose contracts the program needs. The setting
enables contracts across the TypeScript program; it does not discover installed plugins or
change runtime behavior. New application templates leave it disabled.

Alternatively, append `@strapi/types/strict` to `compilerOptions.types`. Keep existing entries,
such as `node`: this option replaces automatic inclusion of ambient type packages and does not
merge arrays from an extended tsconfig. Strapi's participating server packages use this option
for their own checks and builds. They do not import the activation file from published source.

With strict contracts enabled, registered literal names resolve to their contracts:

```ts
const locales = strapi.plugin('i18n').service('locales');
const defaultLocale = await locales.getDefaultLocale(); // string | null
```

Unregistered or dynamic names retain permissive lookup types. Explicit generic arguments on
plugin lookups and config getters remain available. Dotted config paths resolve within the
registered contract, including optional properties and array elements. Array paths and unknown
paths retain the generic fallback. A default value currently does not remove `undefined` from
a registered config result.

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
      interface DefaultServices {
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

Use `DefaultConfigs` for configuration namespaces such as `plugin::greetings`,
`DefaultControllers` for full controller UIDs, and `DefaultPolicies` for full policy UIDs.
Each policy entry describes its configuration, or `undefined` if it accepts none.
Check implementations against their contracts with a type annotation or `satisfies`.
Declare packages referenced by published contracts as dependencies.

The emitted server entry must retain the re-export so consumer programs load the declarations.
An unused `import type {}` in a source file is erased during declaration emit and cannot provide
this guarantee. Do not publish an augmentation of `Settings` through the server entry.
Packages with an `exports` map also need a `typesVersions` mapping for `strapi-server` if they
support the legacy `Node` module resolution mode.

Applications use `Services`, `Configs`, `Controllers`, and `Policies` to add their own contracts
or replace package defaults. Each application entry replaces the whole default for its key.
Use one package contract version per UID per program. Conflicting `Default*` declarations fail
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
application policies, including `global::` policies, to `Strapi.Registries.Policies`.
The generator does not yet collect a complete policy inventory automatically. Policies with
required config must use `{ name, config }`; only policies whose config accepts `undefined`
can be referenced by name alone. Existing untyped `Core.RouteConfig` remains permissive.

## Localization integration

Core depends on `Core.LocalizationProvider`, exposed through `strapi.localization`, for
localization behavior. The i18n plugin registers its implementation during `register`, before
database migrations and content-type synchronization. The adapter resolves i18n services when
called, so application extensions installed later remain visible. Core does not import i18n's
contracts or look up the plugin by name.

Without a provider, content types are treated as nonlocalized, the default locale is `null`,
populate paths are empty, and copying nonlocalized fields leaves the entry unchanged.
Each Strapi instance has its own provider.

## Verifying changes

Build changed packages before running `yarn test:ts`, because consumers use emitted declarations.
`yarn test:types:registries` runs the published-contract tests separately. They check Bundler,
Node, and NodeNext resolution, both switch states, declaration order, application overrides,
editor completions, and accidental publication of strict activation. CI runs these checks
after the monorepo build.

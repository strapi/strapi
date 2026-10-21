---
title: TypeScript
description: 'TypeScript usage conventions and guidelines for Strapi codebase.'
---

This guide covers how the monorepo's server packages use registered contracts. Strapi packages
publish service, controller, policy, middleware, and config contracts through the global `Strapi.Registries`
namespace. Contracts only change lookup types in strict mode, which applications enable with the
`@strapi/strapi/strict-types` entry. Without strict mode, the `@strapi/types` and `@strapi/strapi`
types must stay those of the previous release.

## Strict mode in the monorepo

Strapi's server packages type-check in strict mode. The shared `tsconfig/server.json` preset
loads only the switch, `@strapi/types/strict`. It does not load `@strapi/strapi/strict-types`,
which is the application entry. No published source imports the switch.

Published declarations are emitted **without** the switch. Each server package's
`tsconfig.build.json` extends `["./tsconfig.json", "tsconfig/declarations.json"]`, and the second
preset resets `types` to `["node", "jest"]`. Inferred types in `dist/**/*.d.ts` then resolve as
applications without strict mode see them, instead of freezing strict-mode results (registered
contracts, strict lookups). Package sources must therefore compile in both modes:

- Root lookups (`strapi.service()`, `strapi.controller()`, `strapi.middleware()`,
  `strapi.policy()`) take a type argument only in strict mode. Cast the result instead:
  `strapi.service(uid) as MyService`. Plugin-scoped lookups (`strapi.plugin(name).service<T>()`)
  are generic in both modes.
- Packages whose `registries.ts` imports `@strapi/strapi/strict-types` (plugins) exclude it from
  `tsconfig.build.json`, since it turns strict mode on.
- `yarn test:ts` keeps checking the sources in strict mode, and the strict-off parity helper
  (`tests/types/strict-off-parity`) compares the published types with develop.

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
in the `Package*` registries: `PackageServices`, `PackageControllers`, `PackagePolicies`,
`PackageMiddlewares`, and `PackageConfigs`. The `App*` registries belong to applications.

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
- Check the names of the runtime maps (`services`, `controllers`) against the registered names,
  given by `keyof Core.RegisteredFor<Strapi.Registries.PackageServices, 'plugin::x'>`. A plain
  object literal that `satisfies Record<RegisteredNames, unknown>` is checked both ways. Spread
  entries escape the excess property check: compare such maps with
  `Core.Assert<Core.SameNames<…>>`.
- `Core.ServiceFactory<uid>` checks a service factory against the contract registered for `uid`,
  and `Core.ControllerFactory<uid>` does the same for a controller factory. With strict types
  disabled, `Core.ControllerFactory` accepts a factory that returns any object, because
  `Core.Controller` rejects what `createCoreController` returns.
- In an application, type generation registers the `ServiceContract` type that a service module
  exports. Check the module's factory against its own UID only with that export: without it, the
  registered type is inferred from the factory itself, which is circular (TS7022).
- Declare one contract per UID. Conflicting `Package*` declarations fail with TS2717, and
  `skipLibCheck` can hide the conflict in a consumer.
- A package bundled with `@strapi/strapi` that registers contracts must also be imported by
  `packages/core/strapi/strict-types.d.ts`.
- EE code that merges members into admin services passes the EE shape, `EnterpriseServices`, as an
  explicit type argument. The registered contract is the CE shape with the EE-only members
  optional.

### Config contracts

A config namespace has two types:

- The input type is what applications write in `config/*.ts`, e.g. `Core.Config.Server`. It lives
  in `@strapi/types`.
- The resolved contract is what `strapi.config.get` returns once the loader has merged defaults.
  It lives in the package that loads the config and applies the defaults, under a `ResolvedConfig`
  namespace named like the input type, e.g. `ResolvedConfig.Server`, and is the type registered in
  `PackageConfigs`. A field the loader always defines is required, even when it is optional in the
  input type.

The JSDoc of each type links to the other. `@strapi/core` keeps one file per core namespace in
`packages/core/core/src/types/config/` and registers them in `packages/core/core/src/types/index.ts`.

### Policy and middleware contracts

`PackagePolicies` and `PackageMiddlewares` map a full UID to the config the policy or middleware
accepts: the second parameter of a policy handler, the first parameter of a middleware factory,
`undefined` when there is none. Typed route configs (`Core.RouterInputFor`, `Core.RouteConfigFor`)
treat each registry as a complete inventory: once any entry is registered, they reject unregistered
names. A package that registers policies or middlewares registers all of them.

- A route references a middleware by name alone only when its config is optional. Runtime passes
  `{}` when the config is omitted, so a config whose fields are all optional counts as optional.
- `{ name, config }` checks `config` against the registered contract. Inline handlers and
  `{ resolve, config }` entries are not checked. `Core.RouteConfig` keeps its unchecked type.
- `strapi.middleware(name)` resolves a registered name to `MiddlewareFactory<Config>`, and an
  unregistered or dynamic name to `unknown`. Code that resolves dynamic names passes the factory type
  explicitly: `strapi.middleware<Core.MiddlewareFactory>(name)`.
- `@strapi/core` registers the `strapi::*` middlewares in `packages/core/core/src/types/index.ts`.
  Type generation registers application middlewares (`global::*`, `api::*`) in `AppMiddlewares`
  (`types/generated/middlewares.d.ts`).

### Hook contracts

`Strapi.Registries.Hooks` maps a hook UID to the hook's contract: its kind and the context its
handlers receive, e.g. `Core.AsyncParallelHook<Core.ContentTypesSyncContext>`. It is additive, with
no `Package*` and `App*` pair: any code can replace a hook at runtime (`set` overwrites it, `extend`
wraps it), but the package that calls the hook builds the context, so nobody else can change it.

- The package that sets and calls a hook registers it. Applications register their own hooks in the
  same registry; type generation does not, because hooks are set in code, not loaded from files.
- With strict types, `strapi.hook(uid)` and `strapi.hooks[uid]` resolve a registered UID to its
  contract, and any other UID to `unknown`. `strapi.get('hooks')` resolves to
  `Core.StrictHooksRegistry`: `set`, `add` and `extend` accept only a hook of the registered
  contract for a registered UID, and any hook otherwise.
- `@strapi/types` registers the `strapi::content-types.beforeSync` and `afterSync` hooks of the
  Strapi instance in `packages/core/types/src/core/hook.ts`, so packages that depend only on
  `@strapi/types` see them.

### Core store contracts

`Strapi.Registries.Stores` maps a core store row to the JSON shape of its value. It is keyed by the
storage key the runtime builds from the params of `strapi.store`: `<type>_<name>_<key>`, or
`<type>_<key>` without a name (`packages/core/core/src/services/core-store.ts`). For example,
`{ type: 'plugin', name: 'i18n', key: 'default_locale' }` reads `plugin_i18n_default_locale`. Keys
built at runtime register a template-literal key, e.g.
``[key: `core_admin_homepage-layout:${string}`]``.

- The value is the shape the owner writes, as JSON: a `Date` is read back as a string and
  `undefined` properties are dropped. Declare it explicitly rather than reusing a type that holds
  runtime-only values.
- It is additive, with no `Package*` and `App*` pair. A row is shared data: any code can write it,
  and its owner keeps reading it with its own contract. The package that writes and reads a key
  registers it, in the same `declare global` block as its other contracts. Applications register
  their own keys.
- With strict types, `strapi.store` resolves to `Modules.CoreStore.StrictCoreStore`: a read of a
  registered key resolves to its value or `null` (no row), and a write takes its whole value. The
  type mirrors the runtime defaults: `get` reads `'core'` rows when the params have no type, `set`
  and `delete` do not. Unregistered keys, and wide keys such as `key: string`, keep `unknown`.

### Event contracts

`Strapi.Registries.Events` maps an event name to the tuple of arguments an emit passes after the
name. Nothing defines an event at runtime and several producers can share a name, so the tuple is
the union of every producer's payload, e.g. `'user.delete': [{ user } | { users }]`.

- It is additive, with no `Package*` and `App*` pair. The package that emits a name registers it,
  with the payload of each of its producers. Applications register the events they emit.
- With strict types, `strapi.eventHub` resolves to `Modules.EventHub.StrictEventHub`: an emit of a
  registered name must pass one of its payloads, and `on`, `once` and `addListener` listeners
  receive them. Unregistered names, and wide names such as `string`, keep their types. Subscribers
  receive every event, so they keep any arguments.
- An emit is only checked when its name is a literal. A helper that takes `event: string` passes
  any payload.
- Events emitted through `emitAudit` (`@strapi/utils`) are not registered: it takes any payload, so
  nothing would check their producers.

### Document results

With strict types and generated schemas, Document Service and core service results use
`Modules.Documents.StrictResult` (`packages/core/types/src/modules/documents/result/index.ts`). It
types what the runtime returns, not what the schema asks for:

- `id`, `documentId` and every selected scalar are present (no `?`). A scalar may be `null`, also
  when the attribute is `Required`.
- `publishedAt` follows draft and publish and the status of the call. Document Service reads default
  to drafts and core service reads to published entries. `locale` is a string on localized content
  types.
- `datetime`, `date`, `time` and `timestamp` results are strings. Inputs still accept `Date`.
- Populated to-many attributes are arrays, never `null`. Unpopulated attributes are absent.

The JSDoc on each type gives the runtime reason. Without strict types, results keep develop's
`Result` type.

### Document write inputs

With strict types, the `data` of Document Service `create`, `update` and `clone`, and of the core
service `create`, follows the entity validator
(`packages/core/types/src/modules/documents/params/write.ts`). The rules come from the modifiers
type generation already emits, `Schema.Attribute.Required` and `Schema.Attribute.DefaultTo`:

- The status of the call selects the mode. A draft of a draft and publish content type needs only
  its required repeatable components and dynamic zones. A published entry, or any entry without
  draft and publish, also needs the other required attributes, except those with a default.
- `null` is accepted on optional attributes, and on required ones in drafts. Repeatable components
  and dynamic zones never accept it.
- Required relations and media stay optional: the runtime enforces them only with
  `api.documents.strictRelations`.
- An attribute with a `conditions.visible` rule is optional and nullable: a hidden field skips
  validation. Type generation marks it with `Schema.Attribute.Conditional`, with strict types only.
- `update` and `clone` require no key. On update, a component value with `id` is partial; a value
  without `id` creates a component and follows the create rules.
- `create` requires `data`.

A schema with unknown attributes, such as an unregistered or generic UID, keeps develop's
`Data.Input`. Without strict types, the params keep develop's types. With strict types, type
generation also writes the rule of each attribute as a JSDoc line, which editors show on the input
keys.

## Keeping types unchanged without strict mode

A type in `@strapi/types` or `@strapi/strapi` that behaves differently in strict mode resolves
both shapes from `IsStrict` (`packages/core/types/src/core/strictness.ts`). Other packages read the
same switch as `Core.IsStrict`:

```ts
type Lookup = IsStrict extends false ? LegacyLookup : StrictLookup;
```

The legacy shape is the previous release's type, copied as is. When the published type is an alias
that applications see, such as `Params.Create`, keep the alias and gate inside it: a `never` key or
an `unknown` intersection member without strict types. A conditional at the top of the alias
resolves to its legacy branch, which prints under another name and changes the strict-off surface. The strict-off parity fixtures in
`tests/types/registries/fixtures/parity-*.ts` pin that shape: they must compile against both the
current code and the previous release. `tests/types/registries/consumer.test.cjs` compiles them.

## Verifying changes

Build changed packages before running `yarn test:ts`, because consumers use emitted declarations.
`yarn test:types:registries` runs the published-contract tests separately. They check Bundler,
Node, and NodeNext resolution, both switch states, declaration order, application overrides,
editor completions, and accidental publication of strict activation. CI runs these checks
after the monorepo build.

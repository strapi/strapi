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
`PackageMiddlewares`, and `PackageConfigs`. Content-type schemas go in
`PackageContentTypeSchemas`, described below. The `App*` registries belong to applications.

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
- Do not declare `Strapi.Registries.LicensedFeatures` in published source. Type generation writes
  it, with `Settings.licenses`, into an application's `strict.d.ts`. The consumer tests check both.
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
- In an application, type generation registers the `ServiceContract` or `ControllerContract` type
  that a service or controller module exports. Check the module's factory against its own UID only
  with that export: without it, the registered type is inferred from the factory itself, so type
  generation lists the UID in `Strapi.Registries.InferredServices` or `InferredControllers`, and
  `Core.ServiceFactory` and `Core.ControllerFactory` reject it (TS2344).
- Declare one contract per UID. Conflicting `Package*` declarations fail with TS2717, and
  `skipLibCheck` can hide the conflict in a consumer.
- A package bundled with `@strapi/strapi` that registers contracts must also be imported by
  `packages/core/strapi/strict-types.d.ts`.
- A service or controller that the admin EE edition merges over its CE implementation registers
  `Core.LicensedExtension<CE, EE>`, e.g. `admin::user`: the EE shape when the application lists
  any feature in `licensedFeatures`, the CE shape when it lists none, and the CE shape with the
  EE-only members optional in package and plugin programs. EE-only admin services, such as
  `admin::seat-enforcement`, register `Core.Licensed<'licensed', Contract>`, and the audit logs
  controller `Core.Licensed<'audit-logs', Contract>`. EE code passes the EE service shape,
  `EnterpriseServices`, as an explicit type argument.
- A package whose services and controllers exist only with an EE feature registers each entry as
  `Core.Licensed<'<feature>', Contract>`, e.g. `plugin::review-workflows.workflows`. A CE
  application, or a license without the feature, does not register them. The entry is `Contract`
  when the application lists the feature in `licensedFeatures`, `undefined` when it does not, and
  `Contract | undefined` in package and plugin programs, where strict callers check the lookup
  result.

### Service contracts

A service contract is a `type` in `server/src/types/`. Write the members that applications and
other packages call by hand, with the JSDoc that explains the runtime behavior. Two shapes exist:

- A hand-written type with every member, e.g. `EmailService`
  (`packages/core/email/server/src/types/services.ts`).
- The inferred implementation with the members that need a stricter type replaced:
  `Omit<Implementation, 'upload' | …> & { upload(…): Promise<File[]>; … }`, e.g. `UploadService`.
  Use it when most members already infer the right type. The published implementation keeps its
  own signatures, so the types without strict mode do not change.

Contracts type every member of a registered service, including members that only the package
itself calls. Tag those members `@internal` in their JSDoc, as well as controller actions that no
route references. The tag is documentation only: no build
sets `stripInternal`, so the declarations keep the members and strict callers still see their
types. Other packages and applications must not rely on them.

### Controller contracts and typed routes

A package registers every controller it ships in `PackageControllers`. The contracts sit in
`server/src/types/controllers.ts`, next to a `Controllers` map keyed like the runtime controllers
map:

```ts
// packages/core/email/server/src/types/controllers.ts
export type EmailController = {
  send: Core.ControllerHandler;
  test: Core.ControllerHandler;
  getSettings: Core.ControllerHandler;
  verify: Core.ControllerHandler;
};

export type Controllers = {
  email: EmailController;
};

declare global {
  namespace Strapi {
    namespace Registries {
      interface PackageControllers {
        'plugin::email.email': Controllers['email'];
      }
    }
  }
}
```

- Check the runtime map with `satisfies Controllers`. A missing action fails with TS2741. An
  action the implementation has outside the contract is not reported, because the map's values
  are imported objects, not literals. Compare the action names of each controller with
  `Core.Assert<Core.SameNames<…>>` in a compile-only test to catch it, e.g. admin's
  `server/src/types/__tests__/controller-contracts.test.ts`.
- A controller factory (`({ strapi }) => ({ … })`) is checked in its own module with
  `satisfies Core.ControllerFactory<uid>`. The map check leaves it out, e.g.
  `satisfies Omit<Controllers, 'schema'> & { schema: unknown }`.
- A controller whose action names are built at runtime is left out of the map check the same way.
  Check its sources instead. Admin's `transfer` controller prefixes the actions of `runner.ts` and
  `token.ts` with `mapKeys` (`runner-push`, `token-list`, …), so each source
  `satisfies PrefixedActions<Controllers['transfer'], 'runner'>`, a mapped type that strips the
  prefix from the contract's names. Typing the built map instead would change its published type.
- Check routes against the map: `satisfies Core.RouterInputFor<Controllers, 'plugin::email'>` for a
  router, `satisfies Core.RouteInputFor<Controllers, 'plugin::documentation'>[]` for an array of
  routes. A string handler must name an action of a contract, and policies and middlewares are
  checked as described in [Policy and middleware contracts](#policy-and-middleware-contracts).
- Keep the published route type. `satisfies` on an unannotated literal keeps its literal types,
  which changes the emitted declaration. Annotate the variable with the widened type that develop
  infers, then add `satisfies`.
- Check routes against the hand-written `Controllers` map, not against the registry. A
  `| undefined` entry has no actions to reference.
- A helper that builds routes widens its literals before the route array is checked. Type its
  handler parameter as `Core.ControllerActionReference<Controllers>`, and add
  `satisfies Core.RouteConfigFor` to the `config` it returns so that policy names stay literal, as
  `authenticatedAdminRoute` in admin's `routes/users.ts` does.
- A route that names a policy or middleware of a package this package cannot load is checked
  against a local type that leaves those names unchecked, with a comment naming the reason. Admin's
  forgot-password route uses `plugin::email.rateLimit`, and email peer-depends on admin, so
  importing email's contracts would be a cycle. `ForgotPasswordRoute` in
  `routes/authentication.ts` keeps `middlewares` as `string[]` for that handler only. Applications
  load both packages and check the name.

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
- `auth.strategies` accepts strategy names and strategy objects, as the runtime does (admin's
  transfer routes pass the data-transfer strategy). `Core.RouteConfig` keeps names only.
- `strapi.middleware(name)` resolves a registered name to `MiddlewareFactory<Config>`, and an
  unregistered or dynamic name to `unknown`. Code that resolves dynamic names passes the factory type
  explicitly: `strapi.middleware<Core.MiddlewareFactory>(name)`.
- `@strapi/core` registers the `strapi::*` middlewares in `packages/core/core/src/types/index.ts`.
  Type generation registers application middlewares (`global::*`, `api::*`) in `AppMiddlewares`
  (`types/generated/middlewares.ts`).

### Permission action contracts

`Strapi.Registries.PermissionActions` lists the admin permission action IDs. A key is the ID the
admin action provider computes from the `uid` and `pluginName` of a registered action
(`computeActionId`): `api::<uid>` without a plugin name, `admin::<uid>` for `'admin'`, and
`plugin::<pluginName>.<uid>` otherwise. Values are not read: declare each ID as `true`.

```ts
// packages/core/content-type-builder/server/src/types/index.ts
declare global {
  namespace Strapi {
    namespace Registries {
      /** Registered at bootstrap (`bootstrap.ts`). */
      interface PermissionActions {
        'plugin::content-type-builder.read': true;
      }
    }
  }
}
```

- It is additive, with no `Package*` and `App*` pair. Keys are runtime IDs, not ownership: two
  declarations of an ID describe the same action, so they never conflict. The package that
  registers an action declares its ID, in the file that holds its other registry declarations.
  Applications declare the actions they register.
- Check that the declared IDs equal the registered ones. Write the action list `as const` and
  compare its computed IDs with the declared IDs of the package's namespace:

  ```ts
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type ActionIds = Core.Assert<
    Core.SameNames<
      Core.PermissionActionId<(typeof actions)[number]>,
      Extract<Core.RegisteredPermissionAction, `plugin::content-type-builder.${string}`>
    >
  >;
  ```

  The check is compile-only and fails in both modes, with `{ unregistered, unimplemented }`
  naming the IDs on each side. Filter on the prefix of the IDs the list registers: review
  workflows registers `admin::review-workflows.*`, so admin's own check excludes that prefix.
  A package with several lists compares their union: admin's check covers its CE list and its EE
  lists (`ee/server/src/config/admin-actions.ts`).

- Pass the `as const` list straight to `registerMany`. With strict types, `register` and
  `registerMany` check the computed ID of each action (`Core.PermissionActionCheck`). An
  unregistered ID fails on the `uid`, with a message that names it, e.g.
  `'Unregistered permission action: plugin::i18n.locale.raed'`. Only literal fields are checked:
  a list typed with a wide `uid: string`, as in most application code, passes.
- Action provider reads (`get`, `has`, `appliesToProperty`, `unstable_aliases`) accept any runtime
  ID, such as `string` or a template literal, and reject an unregistered literal with TS2345.
- The `actions` of `admin::hasPermissions` (in its string, tuple and object forms) and of
  `plugin::content-manager.hasPermissions` take `Core.PermissionActionReference`. With strict
  types, once any ID is declared, they accept declared IDs only, and a typo fails with TS2820
  "Did you mean". Without any declared ID they accept any string, unlike policies, where an empty
  inventory accepts no name.
- A package program sees the IDs of the packages it loads (`registries.ts`), as for the other
  registries. Applications load every bundled package.
- Name action IDs in route configs as literals. A constant read from an object without `as const`
  is a `string` and fails the check. Adding `as const` to a published constant changes its
  declaration, so prefer the literal, as upload's `routes/view-configuration.ts` does.
- The IDs of content releases (`cms-content-releases`) and review workflows (`review-workflows`)
  exist only when their EE feature is enabled. Their packages declare them with a JSDoc line that
  names the feature. A route that names one works on every license: without the feature, the
  policy denies, as for any permission the user lacks. Admin declares its EE IDs the same way:
  `admin::provider-login.*` (`sso`) and `admin::audit-logs.*` (`audit-logs`).
- Users-permissions is JavaScript and declares no ID. An application that names its actions
  (`plugin::users-permissions.*`) in a typed config declares them in `PermissionActions`.
- Inside admin, `getService('permission')` returns the registered contract with strict types.
  The strict-off build checks the same code against the implementation, whose `registerMany`
  takes a mutable array, so admin's bootstrap casts the lookup result to
  `Core.ServiceFor<'admin::permission'>` before it passes its `as const` list.
- Register actions in a plugin's `register` or `bootstrap`, or in an application's `register`, not
  in an application's `bootstrap`. Admin's bootstrap runs after the plugins' and before the
  application's, and removes the stored permissions of every unregistered action. The second
  registration of an ID throws at boot, and the second registrant may be the owner.
- Without strict types, `Core.PermissionActionReference` is any string, with the declared IDs
  listed for completion, and the action provider keeps develop's signatures.

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

### Content-type schemas

A package declares the schemas of its own content types by hand, in
`server/src/types/content-types.ts`, as type generation writes them for an application that does
not extend them. Use one interface per content type, extending `Struct.CollectionTypeSchema` or
`Struct.SingleTypeSchema`, and register it in `PackageContentTypeSchemas`:

```ts
// server/src/types/content-types.ts
export interface FileSchema extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  // info, options, pluginOptions as in `content-types/file.ts`
  attributes: Struct.WithSystemAttributes<
    'plugin::upload.file',
    {
      name: Schema.Attribute.String & Schema.Attribute.Required;
      // ...
    }
  >;
}

declare global {
  namespace Strapi {
    namespace Registries {
      interface PackageContentTypeSchemas {
        'plugin::upload.file': FileSchema;
      }
    }
  }
}
```

- Re-export the module from the server entry, as for the other contracts. Upload is the worked
  example: `packages/core/upload/server/src/types/content-types.ts`.
- `Struct.WithSystemAttributes<TUID, TAttributes>` adds the attributes Strapi adds to every content
  type (`createdAt`, `updatedAt`, `publishedAt`, `createdBy`, `updatedBy`, `locale`,
  `localizations`). An own attribute replaces the system attribute of the same name, e.g. `locale`
  on a localized content type.
- Never declare `AppContentTypeSchemas` in a package: only type generation writes it, and
  `yarn test:types:registries` fails when a bundled package's declarations augment it. Packages
  declare no component schemas, because they cannot ship components.
- Type generation writes every runtime UID, package ones included, to `AppContentTypeSchemas`. Its
  entry wins over the package entry for the same UID, because it carries what the application
  changed at runtime (extensions in `src/extensions`, attributes added by other plugins). Without
  generated schemas, as in a package compiled alone, the declared UIDs are precise and every other
  UID stays generic.
- An attribute a package adds to other content types only when the boot license lists a feature,
  such as the review workflows `strapi_stage` and `strapi_assignee`, is declared in
  `Strapi.Registries.LicensedContentTypeAttributes`, keyed by its gate: `attributes`, and the
  `except` schema shapes of the content types the package leaves out. Type generation with strict
  types leaves these attributes out (`LICENSED_ATTRIBUTES` in
  `packages/utils/typescript/src/generators/content-types/index.ts`, which a new attribute joins),
  and strict types add them to the schemas of an application that lists the gate in
  `typescript.licensedFeatures`. Review workflows is the worked example:
  `packages/core/review-workflows/server/src/types/content-types.ts`.
- In strict mode, each declared UID is a required key of `strapi.contentTypes`, as generated UIDs
  are in an application. A plain record such as `Record<UID.ContentType, any>` no longer fits
  `Core.Strapi['contentTypes']`, so type a content-type record parameter as
  `Partial<Core.Strapi['contentTypes']>`. Code that maps over `strapi.contentTypes` and infers the
  result can exceed the type size TypeScript serializes (TS7056): annotate the source as
  `Internal.Registry.GenericContentTypeSchemas`, as `getSchema` in the content-type builder does.
- `examples/strict-types/checks/package-schemas.ts` compares each declaration with the generated
  schema, so a declaration that drifts from the runtime schema fails `yarn test:types:example`. It
  checks the packages installed in that application: those bundled with `@strapi/strapi` load
  through `@strapi/strapi/strict-types`, and another plugin needs to be added to the dependencies
  of `examples/strict-types`, whose type generation then imports its `strapi-server` declarations.

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
service `create`, `update` and `createOrUpdate`, follows the entity validator
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
- The core service defaults the status to `published`, so its writes follow the published rules
  unless the params pass `status: 'draft'`. `createOrUpdate` takes the update input, but its first
  call on an empty single type creates the entry: the create rules then apply at runtime, and the
  types do not check them.

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
editor completions, generated application modules in CommonJS and ECMAScript module
applications, and accidental publication of strict activation. CI runs these checks
after the monorepo build.

`yarn test:types:strict-off` runs the strict-off parity helper (`tests/types/strict-off-parity`)
on this checkout alone, and CI runs it after the published-contract tests. Its fixture application
has no `typescript.strictTypes`. The helper generates the application's types and checks that:

- `types/generated/*` equals the committed copy in `tests/types/strict-off-parity/snapshot/`;
- the application, and the types it declares equivalent in `app/equivalence`, compile without
  errors.

When type generation output changes on purpose, for example after a rebase on a develop that
changed the generators, or after a fixture change, refresh the copy with
`yarn test:types:strict-off --update` and commit it with the change. Review the snapshot diff as
part of the change: an unexplained difference means strict-off type generation moved.

The snapshot does not cover the exported types themselves. `packages/core/types/tests/strict-off.ts`
pins them with `Equal` assertions that `yarn workspace @strapi/types test:ts` compiles without
strict mode: add one for each new type that `IsStrict` gates. The full comparison with develop,
`node tests/types/strict-off-parity/run.cjs --baseline <develop checkout>`, also diffs every type
an application reaches. It needs a second built checkout, so it runs by hand at each rebase.

Each package that registers contracts checks them in two places:

- `server/src/types/registries.test.ts` holds compile-only assertions. The server `tsconfig.json`
  includes it, so `yarn test:ts` checks it in strict mode. `tsconfig.build.json` excludes
  `**/*.test.ts`. Its `@ts-expect-error` lines are the negative controls.
- `tests/types/registries/fixtures/<package>-adoption.ts` checks the same lookups from an
  application, with strict mode on. `<package>-adoption-permissive.ts` checks that loading the
  contracts without strict mode keeps develop's permissive lookups.
  `tests/types/registries/consumer.test.cjs` compiles both.

Applications get typed `strapi.service(uid)` and `strapi.controller(uid)` lookups from type
generation with `typescript.strictTypes`. Read
[Strict service contracts](../packages/core/types/type-system/02-concepts/03-public-registry.mdx#strict-service-contracts-typescriptstricttypes).

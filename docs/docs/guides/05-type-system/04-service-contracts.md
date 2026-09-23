---
title: Service contracts
---

Service contracts let an application opt in to checked service methods without changing runtime registration. Registering a type does not install a plugin, enable it, or verify that it has loaded.

### Opt in to i18n locale reads

Add this import to an application declaration file included by `tsconfig.json`, such as `types/services.d.ts`:

```ts
import type {} from '@strapi/i18n/types';
```

Both lookup forms then use the locale service contract:

```ts
import type { Core } from '@strapi/strapi';

async function findEnglish(strapi: Core.Strapi) {
  const locales = strapi.plugin('i18n').service('locales');
  const locale = await locales.findByCode('en');
  // locale is Locale | null. Its name may also be null.

  const count = await strapi.service('plugin::i18n.locales').count();
  // count is number.

  return { locale, count };
}
```

Wrong arguments, nonexistent methods, and incorrect result assignments on this registered service produce compiler errors. Unknown plugin and service names, dynamic names, and services without a registered contract retain their permissive behavior. This is not a closed list of installed services.

The first i18n contract types read methods. `find` and `count` accept a Query Engine where filter directly, such as `{ name: { $contains: 'en' } }`. Filter fields and operators are not checked yet. Stored locale rows do not include the HTTP response's `isDefault` field. Write and enrichment methods retain their existing permissive signatures.

Import the contract without registering it when an application needs to compose its own service extension:

```ts
import type { LocaleService } from '@strapi/i18n/services';
```

Both subpaths are type-only. Use type imports, not runtime imports. They support legacy Node and Node16 TypeScript module resolution.

### Register an application service

`Public.ServiceRegistry` maps full service UIDs to service instances. Add entries to the interface exported by `@strapi/types` and re-exported by `@strapi/strapi`:

```ts
import type {} from '@strapi/strapi';

type GreetingService = {
  greet(name: string): string;
};

declare module '@strapi/strapi' {
  namespace Public {
    interface ServiceRegistry {
      'plugin::greetings.greeting': GreetingService;
    }
  }
}
```

Both `strapi.service('plugin::greetings.greeting')` and `strapi.plugin('greetings').service('greeting')` now return `GreetingService`. Where possible, derive the instance type from the actual service implementation, for example with `ReturnType<typeof createGreetingService>`.

Package-provided contracts are registered separately in `Public.DefaultServiceRegistry`. Lookup selects an application entry in `Public.ServiceRegistry` first, then a package default, then the permissive fallback. An application entry replaces the whole default contract rather than intersecting with it.

The separate registries are deliberate. Existing `Public.Services` augmentations keep their previous behavior. Both new registries are exposed only through the `Public` namespace. Internal lookup types must import them from the public barrel (`src/public/index.ts`), not directly from `src/public/registries.ts`: TypeScript applies this namespace augmentation at the barrel. Direct imports from the declaration file do not receive those entries.

### Generated application service contracts

`strapi develop` and `strapi ts:generate-types` emit `types/generated/services.d.ts` next to the content-type and component definitions. It registers every application service (`api::<api>.<service>`) in `Public.ServiceRegistry`, typed from its source file:

```ts
import type { Core } from '@strapi/strapi';

type ServiceInstance<TModule> = TModule extends { default: infer TExport }
  ? TExport extends (...args: any[]) => infer TInstance
    ? TInstance
    : TExport
  : Core.Service;

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ServiceRegistry {
      'api::article.article': ServiceInstance<
        typeof import('../../src/api/article/services/article')
      >;
    }
  }
}
```

The registered type is the return type of the module's default export when it is a factory (`createCoreService(...)` or `({ strapi }) => ({ ... })`), or the default export itself when it is a plain object. A module without a default export keeps the permissive `Core.Service`, which matches the runtime: the loader registers `undefined` for it.

The generator mirrors the API loader (`@strapi/core`, `loaders/apis.ts`): it walks `src/api/<api>/services/*.{ts,js}`, derives the uid with the same kebab-case normalization, and only emits entries for uids the running application registered. When a `.ts` and a `.js` file resolve to the same uid, the `.ts` one wins with a warning. Plugin and admin services are not emitted; their contracts belong to the packages, in `Public.DefaultServiceRegistry`.

Like the content-type and component registries, this namespace-style augmentation shadows the base `Public.ServiceRegistry` rather than merging with it. That is harmless here because the base interface is declared empty: the generated entries are all it ever holds. Unregistered uids keep their permissive type through `ServiceFor`, which falls back to `Core.Service`, so `UID.Service` stays open and existing lookups are unaffected.

#### Circular inference in `createCoreService`

Because the contract is inferred from the implementation, a service that looks itself up through the registry is circular. How the compiler resolves that depends on how the service is declared.

A service created with `createCoreService` collapses to `any` in full. The factory infers its `TService` type parameter from the object literal it receives, so a registry lookup inside that literal asks for the type being inferred. The compiler reports `TS7022` on the default export, and every method of the service becomes `any`, including the ones that have nothing to do with the cycle:

```ts
export default factories.createCoreService('api::article.article', ({ strapi }) => ({
  // error TS7022: 'default' implicitly has type 'any' because it does not have a type
  // annotation and is referenced directly or indirectly in its own initializer.
  async findRandomTitle() {
    const article = await strapi.service('api::article.article').findRandom();

    return article?.title;
  },

  // also any, despite having no part in the cycle
  async unrelated() {
    return 'a plain string';
  },
}));
```

Annotating the return type of the method that closes the cycle restores the whole contract:

```ts
async findRandomTitle(): Promise<string | null | undefined> {
  const article = await strapi.service('api::article.article').findRandom();

  return article?.title;
}
```

A plain factory has no type parameter to infer, so the same self-lookup resolves structurally and needs no annotation:

```ts
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async other() {
    return 42;
  },

  // Promise<number>, no diagnostic
  async selfLookup() {
    return strapi.service('api::article.plain-self').other();
  },
});
```

Two services that call each other are the milder case: the compiler reports `TS7023` and gives the individual methods the `any` return type, but the service objects keep their shape. Annotating either return type resolves it. Looking up a _different_ service is never circular and carries no penalty.

These diagnostics come from `noImplicitAny`. Applications generated by `create-strapi-app` enable `strict`, so they surface as errors; where `noImplicitAny` is off, the contract degrades to `any` with no diagnostic.

### Build compatibility and extensions

Ordinary `Core.Strapi` lookups do not become stricter merely because an application upgrades. The i18n registration is absent from its ordinary server declaration entry point. Importing the opt-in module anywhere in a TypeScript program applies its contract throughout that program, including other files and dependencies checked in that program.

Opting in can expose previously accepted invalid calls. It can also reject custom methods added by an application extension. For an extended service, import the contract from `/services` and register the final application contract. This can coexist with the stock `/types` import:

```ts
import type {} from '@strapi/i18n/types';
import type { LocaleService } from '@strapi/i18n/services';
import type {} from '@strapi/strapi';

type ExtendedLocales = LocaleService & {
  displayName(code: string): Promise<string>;
};

declare module '@strapi/strapi' {
  namespace Public {
    interface ServiceRegistry {
      'plugin::i18n.locales': ExtendedLocales;
    }
  }
}
```

The app override takes precedence over the package default for the same UID. To replace an existing method signature, use `Omit<LocaleService, 'methodName'>` before adding the replacement; intersecting two incompatible method signatures does not replace them. Derive the final contract from the extension implementation where possible.

Two declarations for the same UID within the same registry must still agree. This design separates package defaults from application overrides; it does not resolve conflicting overrides from multiple application files. Existing explicit calls such as `service<ExtendedLocales>('locales')` remain available, but the caller is responsible for their accuracy.

### Moving toward default typing

When package contracts become enabled by default, existing application entries in `Public.ServiceRegistry` continue to take precedence. Applications do not have to delete their overrides to avoid duplicate-property conflicts with built-in types. However, an override can hide later corrections to the default contract, so applications remain responsible for matching their actual implementation.

The `/types` export should remain available and point to the same registration module if that module later becomes part of the normal declaration graph. Existing opt-in imports can then remain in application code without a second migration. Enabling default contracts can still reveal errors in applications without overrides, so it remains a potentially breaking type change.

Direct consumers that derive types from the i18n server implementation can see stricter read signatures without importing `/types`. Those imports already expose implementation details; this change must be considered when assessing release compatibility. The opt-in guarantee applies to ordinary registry lookups, not to previously imported implementation signatures.

No runtime lookup or validation behavior changes. These types cannot guarantee that a plugin is enabled or that an application extension preserves the declared implementation.

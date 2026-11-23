---
title: '@strapi/utils'
sidebar_label: 'utils'
description: 'Shared server helpers for Strapi packages: hooks, providers, errors, schema traversal, sanitize and validate.'
package: '@strapi/utils'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
  - The Async utils page still needs a review. Its note says `lib/async.js` is now `src/async.ts`.
---

## Purpose

`@strapi/utils` holds the code that several Strapi packages share. It covers hooks, providers, errors, content type helpers, query parameter conversion, schema traversal, and the sanitize and validate layers of the Content API.

The package runs on the server. The admin code imports only types from it, for example `errors`. Most server packages depend on it, including `@strapi/core`, `@strapi/database`, `@strapi/permissions` and the plugins.

`src/index.ts` is the only entry point. It exports most helpers as a namespace, for example `errors`, `hooks`, `sanitize` and `validate`.

## Key concepts

### Provider factory

`providerFactory` creates a keyed store with `register`, `get`, `delete`, `has`, `keys`, `values` and `clear`. Each provider has `hooks` (`willRegister`, `didRegister`, `willDelete`, `didDelete`). By default, `register` throws when the key already exists, or when another registration of the same key is still waiting on `willRegister`. The option `throwOnDuplicates: false` turns this off. The permission engine uses providers for its actions and conditions.

### Hooks

The `hooks` namespace creates hook objects: `createAsyncSeriesHook`, `createAsyncSeriesWaterfallHook`, `createAsyncParallelHook` and `createAsyncBailHook`. A hook object has `register`, `delete`, `getHandlers` and `call`. The factory decides how `call` runs the handlers. The [hooks registry](../../../architecture/04-extension-points.md#hooks-registry) and the permission engine build on them.

The hook types take the handler type as a parameter, `Handler` (`(...args: any[]) => any`) by default. An untyped hook takes any handler and any context, and its types are the ones it had before the hooks took a handler type: a series hook resolves to `void`, a parallel hook to `any[]`, a bail hook to `any`, and a waterfall hook to `unknown` from the factory or `any` through the `AsyncSeriesWaterfallHook` interface. A hook created with a handler type, for example `createAsyncBailHook<(context: Context) => boolean>()`, checks the handlers it registers, the one context `call` takes (`HookContext<T>`, the handler's first parameter) and what `call` resolves to. `HookResult<T>` is what one handler resolves to, and each kind of hook builds its own result from it:

| Hook                  | Typed `call` resolves to                                                         |
| --------------------- | -------------------------------------------------------------------------------- |
| Series                | `void`                                                                           |
| Parallel              | `HookResult<T>[]`, one result per handler                                        |
| Bail                  | `HookResult<T> \| undefined`, `undefined` when every handler returns `undefined` |
| Waterfall (interface) | `HookContext<T>`, the value the handlers pass along                              |
| Waterfall (factory)   | `Awaited<HookContext<T>> \| HookResult<T>`, see below                            |

A waterfall handler passes its awaited result to the next handler, so `AsyncSeriesWaterfallHook<T>` requires `T` to resolve to the type it takes (`WaterfallHandler<T>`), and resolves to that type. A context that is only a promise does not pass this check, because the next handler receives the awaited value. The check is on the interface only: `createAsyncSeriesWaterfallHook<T>()` keeps `T extends Handler`, because `ReturnType<typeof createAsyncSeriesWaterfallHook>` reads that constraint. The factory hook therefore resolves to the context or to the handler result (`Awaited<HookContext<T>> | HookResult<T>`). Declare a typed waterfall hook as an `AsyncSeriesWaterfallHook<T>` to have its handler checked. A hook whose handler takes no parameter, or an optional one, is called without a context. The test reads the handler's parameter list, as TypeScript does for a plain function, so it also holds without `strictNullChecks`: a handler that takes `(context: Context | undefined)` still needs its context, as `undefined` if need be.

A generic helper that forwards a context to a hook takes `...args: Parameters<AsyncSeriesHook<T>['call']>` and calls `hook.call(...args)`. A `HookContext<T>` argument does not match the parameters of `call` while `T` is generic.

### Errors

The `errors` namespace defines `ApplicationError` and its subclasses, for example `ValidationError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError` and `PolicyError`. Each error has a `name`, a `message` and `details`. The errors middleware in `@strapi/core` formats these errors into the HTTP error response.

An app can load two copies of `@strapi/utils` when its Strapi packages are on different versions. `instanceof` on these errors still matches across copies: each class marks its prototype with a `Symbol.for('strapi.errors.class:<Id>')` key, and `ApplicationError` looks for that key on the error's prototype chain in `Symbol.hasInstance`. Both copies need this check for it to work.

### Schema traversal

`traverseEntity` walks a data entity along its schema. It calls a `Visitor` for each attribute, and it recurses into relations, media, components and dynamic zones. The `traverse` namespace does the same for query parameters: fields, filters, sort and populate. See [traverseEntity](./traverse-entity.md).

`traverseQueryPopulate` recurses into relations, media, components, `on` fragments of dynamic zones and polymorphic relations, and nested `populate` keys. It does not recurse into `sort`, `filters` and `fields` keys. A visitor that checks them runs the matching traversal itself, as the default validators and sanitizers do. A visitor must not recurse into a nested `populate`, because the traversal already visits it with the same visitor.

Below a relation, media, component or `on` fragment, the keys of a populate value are query keywords, even when the schema also has an attribute with the same name. There, `populate` is always a nested populate of that schema, and `sort`, `filters` and `fields` are not walked. Elsewhere, a key that names an attribute is that attribute.

#### Writing a populate visitor

`traverseQueryPopulate` deep-copies the populate it is given once, before it walks it. The levels below are not copied again, and neither is a value a visitor sets. A custom visitor follows three rules:

- Change the populate only with `set` and `remove`.
- Never write into `value` or `data`. Build a new object or array and `set` it.
- `set` a fresh value, not one that is shared with anything else, such as a module constant or the query of the caller.

Earlier versions deep-copied every level, so a visitor that wrote into its `value` changed only the copy of that level. Now the write reaches the one copy that every later level and visitor reads. If a visitor sets a shared value, a later write also reaches the other owners of that value. [`populate-copy.vitest.test.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/utils/src/__tests__/populate-copy.vitest.test.ts) runs each built-in populate visitor with the values it is handed frozen.

### Sanitize and validate

`sanitize.createAPISanitizers` and `validate.createAPIValidators` build the Content API input, output and query checks from `traverseEntity` visitors. The `sanitize` visitors (`remove-*`) drop what is not allowed. The `validate` visitors (`throw-*`) throw a `ValidationError` instead. `@strapi/core` creates both in its `content-api` service.

### Async helpers

The `async` namespace has `pipe`, `map` and `reduce` for promises. See [Async utils](./async.md).

### Content type and query helpers

The `contentTypes` namespace holds the attribute name constants (for example `ID_ATTRIBUTE` and `DOC_ID_ATTRIBUTE`), the reserved attribute names and predicates on schemas. The `queryParams` namespace converts REST query parameters into the query format of the database layer.

## Related

- [Extension points](../../../architecture/04-extension-points.md): the hooks registry uses the hook objects of this package.
- [HTTP request path](../../../architecture/06-http-request-path.md): how a request reaches a controller. Controllers call the sanitize and validate helpers, and the errors middleware formats thrown errors.
- [`@strapi/permissions`](../permissions/index.md): builds its engine on `providerFactory` and `hooks`.
- [`@strapi/core`](../core/index.md): applies sanitize, validate and the error formats.

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

`providerFactory` creates a keyed store with `register`, `get`, `delete`, `has`, `keys`, `values` and `clear`. Each provider has `hooks` (`willRegister`, `didRegister`, `willDelete`, `didDelete`). By default, `register` throws when the key already exists. The option `throwOnDuplicates: false` turns this off. The permission engine uses providers for its actions and conditions.

### Hooks

The `hooks` namespace creates hook objects: `createAsyncSeriesHook`, `createAsyncSeriesWaterfallHook`, `createAsyncParallelHook` and `createAsyncBailHook`. A hook object has `register`, `delete`, `getHandlers` and `call`. The factory decides how `call` runs the handlers. The [hooks registry](../../../architecture/04-extension-points.md#hooks-registry) and the permission engine build on them.

### Errors

The `errors` namespace defines `ApplicationError` and its subclasses, for example `ValidationError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError` and `PolicyError`. Each error has a `name`, a `message` and `details`. The errors middleware in `@strapi/core` formats these errors into the HTTP error response.

### Schema traversal

`traverseEntity` walks a data entity along its schema. It calls a `Visitor` for each attribute, and it recurses into relations, media, components and dynamic zones. The `traverse` namespace does the same for query parameters: fields, filters, sort and populate. See [traverseEntity](./traverse-entity.md).

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

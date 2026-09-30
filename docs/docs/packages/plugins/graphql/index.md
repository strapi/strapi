---
title: '@strapi/plugin-graphql'
sidebar_label: 'graphql'
description: 'Server plugin that builds a GraphQL schema from content types and serves it through Apollo Server.'
package: '@strapi/plugin-graphql'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
  - The default config has a `subscriptions` key, but no code in `server/src` reads it. Check whether the key is dead.
  - The list of config keys comes from `config()` calls in the code. Check it against the public docs at docs.strapi.io.
---

## Purpose

`@strapi/plugin-graphql` adds a GraphQL endpoint to a Strapi application. At `bootstrap`, the plugin turns the content types and components into a GraphQL schema ("shadow CRUD"). It then serves the schema with Apollo Server on a Koa route. The plugin runs on the server. Its admin entry only registers the plugin id. Application developers install it. Other plugins extend the schema through its `extension` service.

## Key concepts

### Bootstrap builds and mounts the schema

The plugin has no `register` function. [`bootstrap.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/graphql/server/src/bootstrap.ts) calls `service('content-api').buildSchema()`. If the schema is empty, it logs a warning and stops. Otherwise it creates an `ApolloServer`, starts it and mounts one `ALL` route at the `endpoint` config value. The route sets `config.auth: false`, because the handler chain authenticates by itself. The chain has four steps:

1. `cors`, unless `apolloServer.cors` is `false`.
2. `koa-bodyparser`, unless `apolloServer.bodyParserConfig` is `false`.
3. An auth step. It sets `ctx.state.route.info.type` to `content-api` and calls `strapi.auth.authenticate`. It skips authentication for a `GET` that loads the landing page.
4. `koaMiddleware` from `@as-integrations/koa`.

The plugin also sets `strapi.plugin('graphql').destroy` to stop Apollo Server on shutdown.

### Config

The default config is in `server/src/config/default-config.ts`: `shadowCRUD` (`true`), `endpoint` (`/graphql`), `maxLimit` (`-1`), `apolloServer` (`{}`) and `v4CompatibilityMode` (from `STRAPI_GRAPHQL_V4_COMPATIBILITY_MODE`). The code also reads `depthLimit`, `defaultLimit`, `landingPage`, `generateArtifacts` and `artifacts`. `playgroundAlways` is deprecated. `bootstrap` logs a warning when `depthLimit` or `maxLimit` is not a positive finite number. The `apolloServer` value is merged into the Apollo options, and arrays are concatenated.

### Schema build

The `content-api` service ([`services/content-api/`](https://github.com/strapi/strapi/tree/develop/packages/plugins/graphql/server/src/services/content-api)) creates a new `type-registry` and new `builders` on each `buildSchema()` call. It registers scalars and internal types. With `shadowCRUD` on, it registers types, filters, inputs, enums, dynamic zones, queries and mutations for every content type and component, except `admin::` ones. It then builds a Nexus schema and merges it with the SDL from extensions. Then it adds extension resolvers, wraps the resolvers and prunes unused types.

### Extension service

`strapi.plugin('graphql').service('extension')` is the public hook. `use(config)` takes an object or a factory `({ strapi, nexus, typeRegistry })`. The config can hold `types`, `typeDefs`, `resolvers`, `resolversConfig` and Nexus `plugins`. `shadowCRUD(uid)` returns a manager. Its methods include `disable`, `disableQueries`, `disableMutations`, `disableActions` and `field(name)`. The schema is built once, so plugins call the service in `register`, before this plugin's `bootstrap`. The [users-permissions](../users-permissions/index.md) and [i18n](../i18n/index.md) plugins do this.

### Resolver wrapping

`wrapResolvers` in `services/content-api/wrap-resolvers.ts` reads `resolversConfig`. The keys are `Type.field` paths. Each entry can set `auth` (with a `scope`), `middlewares` and `policies`. The auth check reads `context.state.auth`. Policies run last, through `createPoliciesMiddleware`.

### Landing page and CSP

`determineLandingPage` picks the Apollo landing page from the `landingPage` config. The default is local outside production and hidden in production. It stores the result in the `utils` service (`playground.setEnabled`). The core `strapi::security` middleware reads `playground.isEnabled()` to add Apollo hosts to the content security policy.

## Related

- [Extension points](../../../architecture/04-extension-points.md): the `register` and `bootstrap` phases that decide when to call the extension service.
- [HTTP request path](../../../architecture/06-http-request-path.md): how a route added with `strapi.server.routes` handles a request.
- [Authentication](../../../architecture/08-authentication.md): the Content API auth strategy that the endpoint calls.
- [users-permissions](../users-permissions/index.md): adds login, register and `me`, and replaces user and role mutations.
- [i18n](../i18n/index.md): adds the `I18NLocaleCode` scalar and a locale argument plugin.

---
title: '@strapi/plugin-sentry'
sidebar_label: 'sentry'
description: 'Server plugin that starts Sentry, reports errors thrown during HTTP requests, and exposes a sentry service.'
package: '@strapi/plugin-sentry'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

`@strapi/plugin-sentry` sends the errors that Strapi requests throw to [Sentry](https://sentry.io). The plugin runs on the server. It starts the Sentry Node SDK during `bootstrap` and adds a Koa middleware that reports errors and rethrows them. It also exposes a `sentry` service, so application code can send errors by hand. Project owners install it. The admin part only registers the plugin id and adds no UI.

## Key concepts

### Config

[`server/src/config.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/sentry/server/src/config.ts) sets the defaults. The plugin validator does nothing.

- `dsn`: the Sentry DSN. The default is `null`.
- `sendMetadata`: when `true` (the default), the plugin attaches request data and tags to each event.
- `init`: an object that the plugin spreads into `Sentry.init()`. It comes after `dsn` and `environment`, so it can override both.

Set the values in `config/plugins` under `sentry.config`.

### The `sentry` service

[`server/src/services/sentry.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/sentry/server/src/services/sentry.ts) holds the SDK state. Its API has three methods:

- `init()` starts Sentry once. With no `dsn`, it logs an info message and stays disabled. If `Sentry.init()` throws, it logs a warning and stays disabled.
- `getInstance()` returns the SDK object, or `null` when Sentry is not running.
- `sendError(error, configureScope?)` calls `captureException` inside `withScope`. It runs `configureScope` only when `sendMetadata` is `true`. It logs a warning and returns when Sentry is not ready.

Other code reads the service with `strapi.plugin('sentry').service('sentry')`.

### Error middleware

`bootstrap` calls [`initSentryMiddleware`](https://github.com/strapi/strapi/blob/develop/packages/plugins/sentry/server/src/middlewares/sentry.ts). The function calls `service.init()`. If Sentry did not start, it returns and adds nothing. Otherwise it registers a Koa middleware with `strapi.server.use`. The middleware wraps `next()` in a `try` block. On an `Error`, it calls `sendError` with a scope callback and then rethrows the error.

The plugin does not export the middleware. It is not in the `middlewares` registry, so users cannot list it in `config/middlewares`.

### Event metadata

The scope callback in the middleware adds the Koa request through `Handlers.parseRequest`. It also sets the tags `transaction` (method and matched route), `strapi_version` and `method`. These tags exist only when `sendMetadata` is `true`.

### No content types or admin UI

The plugin adds no content types, routes, controllers or permissions. The admin entry calls `app.registerPlugin` and `registerTrads` only.

## Related

- [Server lifecycle](../../../architecture/02-server-lifecycle.md): when plugin `bootstrap` runs, relative to the HTTP server start.
- [HTTP request path](../../../architecture/06-http-request-path.md): where a Koa middleware added with `strapi.server.use` sits in a request.
- [Extension points](../../../architecture/04-extension-points.md): how plugin `config` is merged and read.

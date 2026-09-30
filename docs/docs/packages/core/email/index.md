---
title: '@strapi/email'
sidebar_label: 'email'
description: 'Core plugin that sends emails through a configurable provider and adds an admin settings page to check the setup.'
package: '@strapi/email'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

`@strapi/email` is a core plugin that sends emails from a Strapi application. It hides the email backend behind one `send` function and one config key, `provider`. It runs on the server, with a small admin part for the settings page.

The admin panel uses it to send password reset emails. The `users-permissions` plugin uses it for its confirmation and reset emails. Application developers call it from their own code. Provider packages such as `@strapi/provider-email-nodemailer` implement the actual delivery.

## Key concepts

### Provider

A provider is a module that exports `init(providerOptions, settings)` and returns an object with a `send` function. It can also return `verify`, `isIdle`, `close` and `getCapabilities`. The `bootstrap` function reads `plugin::email` config, loads the module `@strapi/provider-email-<provider>` (or the plain module name when no such package exists), and stores the instance in `strapi.plugin('email').provider`. If the module fails to load, bootstrap throws `Could not load email provider`. See [`bootstrap.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/email/server/src/bootstrap.ts).

The default config uses the `sendmail` provider and a `defaultFrom` address. The package depends on `@strapi/provider-email-sendmail` for this default. See [`config.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/email/server/src/config.ts).

### Email service

The `email` service has three functions: `send`, `sendTemplatedEmail` and `getProviderSettings`. `send` passes the options to the provider. `sendTemplatedEmail` fills `subject`, `text` and `html` with a lodash template, and allows only the variables that exist in the data object. Other code calls it as `strapi.plugin('email').service('email')`. See [`services/email.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/email/server/src/services/email.ts).

### Routes

The plugin has two route sets. The `content-api` route `POST /` sends an email and validates its input and response with an `EmailRouteValidator`. The `admin` routes (`send`, `test`, `settings`, `verify`) serve the settings page. The `test`, `settings` and `verify` routes require the `plugin::email.settings.read` permission, which `bootstrap` registers in the admin action provider.

### Rate limit middleware

The plugin defines the middleware `plugin::email.rateLimit`, built on `koa2-ratelimit`. It keys the limit on `request.body.email`. The admin authentication routes use it. The email routes of the plugin do not. Read `plugin::email` config `ratelimit` to change the limits. See [`middlewares/rateLimit.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/email/server/src/middlewares/rateLimit.ts).

### Settings page

The admin part adds an `Email Plugin` section to the admin settings with `app.addSettingsLink`. The page shows the config from the `settings` route and offers a test email. It also offers a connection check when the provider has a `verify` function. The `capabilities` and `isIdle` fields come from optional provider functions. The types are in [`shared/types.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/email/shared/types.ts).

## Related

- [Extension points](../../../architecture/04-extension-points.md): how plugins register config, routes, services and middlewares.
- [Server lifecycle](../../../architecture/02-server-lifecycle.md): when the plugin `bootstrap` runs and loads the provider.
- [Authentication](../../../architecture/08-authentication.md): password reset flows send email through this plugin.
- [`@strapi/provider-email-sendmail`](../../providers/email-sendmail/index.md): default provider.
- [`@strapi/provider-email-nodemailer`](../../providers/email-nodemailer/index.md): SMTP provider that supports `verify`.
- [`@strapi/plugin-users-permissions`](../../plugins/users-permissions/index.md): sends confirmation and reset emails.

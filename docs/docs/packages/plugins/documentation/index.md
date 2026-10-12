---
title: '@strapi/plugin-documentation'
sidebar_label: 'documentation'
description: 'Generates an OpenAPI document from routes and content types and serves it with Swagger UI at /documentation.'
package: '@strapi/plugin-documentation'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
  - 'The package README describes a `settings.json` file in `src/extensions/documentation/config`. No code in the package reads that file. The code reads the plugin config (`plugin::documentation`). Update the README.'
  - 'The `DELETE /deleteDoc/:version` route in `server/src/routes/index.ts` has `policies: []`, unlike the other admin routes. Check that this is intended.'
---

## Purpose

`@strapi/plugin-documentation` creates an OpenAPI 3 document for the REST API of a Strapi application. It shows the document with Swagger UI. The plugin has a server part and an admin part. The server part generates the files and serves the UI. The admin part lists the versions and gives access to the settings. Application developers install it. Other plugins, such as `upload` and `users-permissions`, give it hand-written specs.

## Key concepts

### Config is a base OpenAPI document

The default config in `server/src/config/default-plugin-config.ts` is an OpenAPI document with empty `paths`. Users override it under `documentation.config` in `config/plugins`. The value `info.version` names the documentation version. The key `x-strapi-config` holds two plugin options. `plugins` lists the plugins to document, and `null` means the defaults `upload` and `users-permissions`. `mutateDocumentation` is a function that can change the final document before the plugin writes it.

### Generation

The `documentation` service ([`services/documentation.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/documentation/server/src/services/documentation.ts)) has `generateFullDoc(version?)`. It takes the base config and, for each API and each documented plugin, adds `paths` and `components.schemas` from the routes and content types. The helpers are in `services/helpers/`. It skips APIs that an override excludes. It then merges the registered overrides whose `info.version` is unset or equal to the version. Last, it runs `mutateDocumentation` and writes `full_documentation.json`.

The file goes to `<extensions dir>/documentation/documentation/<version>/`. In production, the extensions dir is `<distDir>/src/extensions`. Otherwise it is `<appDir>/src/extensions`.

### Bootstrap

`bootstrap` registers four RBAC actions with `admin::permission`: `plugin::documentation.read`, `settings.update`, `settings.regenerate` and `settings.read`. It seeds `{ restrictedAccess: false }` in the plugin store. Outside production, it also calls `generateFullDoc()`, so a new `info.version` creates a new version at the next start.

### Override service

The `override` service lets other plugins document their own routes. `registerOverride(spec, { pluginOrigin, excludeFromGeneration })` takes an object or a YAML string. It skips the override when `pluginOrigin` is not in the documented plugin list. `excludeFromGeneration` removes those APIs from automatic generation. The `upload` and `users-permissions` plugins call it in `register` when `strapi.plugin('documentation')` exists.

### Routes and access control

`register` adds a route for the Swagger UI static files at `/plugins/documentation/(.*)`. The plugin routes serve the UI at `/documentation` and `/documentation/v<major>.<minor>.<patch>`. The `index` controller reads the JSON file and fills the `public/index.html` template. When the `restrictedAccess` setting is `true`, the `restrict-access` middleware redirects to `/documentation/login` unless `ctx.session.documentation.logged` is set. The login controller compares the password with a bcrypt hash in the plugin store. The routes `getInfos`, `regenerateDoc` and `updateSettings` use the `admin::hasPermissions` policy. The route `deleteDoc` sets an empty `policies` list.

### Admin

`admin/src/index.ts` adds a menu link (`plugins/documentation`) in `register` and a `global` settings link in `bootstrap`. The main page lists versions with open, regenerate and delete actions. The settings page edits `restrictedAccess` and the password. The `PERMISSIONS` constants in `admin/src/constants.ts` map to the four RBAC actions.

## Related

- [Extension points](../../../architecture/04-extension-points.md): how a plugin reaches another plugin service in `register`.
- [HTTP request path](../../../architecture/06-http-request-path.md): how routes, policies and route middlewares apply.
- [users-permissions](../users-permissions/index.md): registers a hand-written OpenAPI spec through the override service.
- [Upload](../../core/upload/index.md): registers its own spec the same way.
- [OpenAPI](../../core/openapi/index.md): a separate package that generates OpenAPI documents. This plugin does not use it.
- [Admin](../../core/admin/index.md): owns the permission action provider that `bootstrap` uses.

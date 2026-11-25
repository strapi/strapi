---
title: '@strapi/plugin-users-permissions'
sidebar_label: 'users-permissions'
description: 'Content API authentication and authorization with users, roles, permissions, JWT and OAuth providers.'
package: '@strapi/plugin-users-permissions'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
  - The `refresh` JWT mode (cookies, session routes, `sessions.*` keys) is only summarized here. The Authentication architecture page describes it. Neither page is checked against the controllers in `server/src/controllers/auth.js`.
  - The list of OAuth providers and their `authCallback` code (`services/providers-registry.js`) is not reviewed.
---

## Purpose

`@strapi/plugin-users-permissions` protects the Content API of a Strapi application. It adds end users, roles and permissions, and it registers the authentication strategy that turns a JWT into an ability. It also provides register, login, password reset, email confirmation and OAuth routes. The plugin runs on the server and in the admin panel. The admin part is a settings section where an admin user edits roles, providers, email templates and advanced settings. `create-strapi-app` adds the plugin to each new project.

## Key concepts

### Content types

The plugin adds three content types. `plugin::users-permissions.user` (table `up_users`) has `username`, `email`, `provider`, `password`, `resetPasswordToken`, `confirmationToken`, `confirmed`, `blocked` and a `role` relation. `role` (`up_roles`) has `name`, `description`, a unique `type`, and relations to permissions and users. `permission` (`up_permissions`) has an `action` string and a `role` relation. `role` and `permission` are hidden from the Content Manager and the Content-Type Builder. The user type stays visible. The Content Manager reads the `layout.user.actions` config of the plugin and sends user create and update to the `contentManagerUser` controller.

### `register`

[`server/src/register.js`](https://github.com/strapi/strapi/blob/develop/packages/plugins/users-permissions/server/src/register.js) does four things:

- It registers the strategy `users-permissions` for the `content-api` auth scope, with `strapi.get('auth').register`.
- It adds a `content-api.output` sanitizer that removes the `users` relation from role entities.
- It calls `server/src/graphql` when the `graphql` plugin exists. That code disables queries and mutations on permissions, replaces the create, update and delete mutations of users and roles, and adds the `me` query and the auth mutations (`login`, `register` and the password and email flows).
- It registers a hand-written OpenAPI spec (`documentation/content-api.yaml`) with the `documentation` plugin when it exists.

### Authentication strategy

`strategies/users-permissions.js` exports `authenticate` and `verify`. `authenticate` reads the Bearer token with the `jwt` service and loads the user. It rejects blocked users, and unconfirmed users when `email_confirmation` is on. It then builds an ability from the role permissions with `strapi.contentAPI.permissions.engine.generateAbility`. A request with no token gets the permissions of the `public` role, if the role has any. `verify` checks each `config.scope` entry of the route against the ability. Read [Authentication](../../../architecture/08-authentication.md).

### `bootstrap`

`bootstrap` seeds three plugin store keys: `grant` (provider config), `email` (templates) and `advanced` (`allow_register`, `email_confirmation`, `default_role` and others). It registers the admin RBAC actions for roles, providers, email templates and advanced settings. It calls the `users-permissions` service `initialize()`. That method creates the `Authenticated` and `Public` roles when no role exists, and runs `syncPermissions()`. `syncPermissions` deletes permissions for actions that no longer exist and creates the default ones when the table is empty. `bootstrap` then defines the `users-permissions` origin on the session manager. If `jwtSecret` is not set, it throws outside `development`. In `development`, it generates a secret and appends `JWT_SECRET` to the `.env` file.

### Config and JWT modes

The defaults are in [`server/src/config.js`](https://github.com/strapi/strapi/blob/develop/packages/plugins/users-permissions/server/src/config.js): `jwtSecret` (from `JWT_SECRET`), `jwt` (`expiresIn: '30d'`), `jwtManagement`, `sessions`, `ratelimit` (60 seconds, 10 requests), `layout` and `callback.validate`. The `jwtManagement` key selects the mode. `legacy-support` (default) signs one long-lived JWT with `jsonwebtoken`. `refresh` issues short-lived access tokens and refresh tokens through the core session manager. The `jwt` service has `getToken`, `issue` and `verify`. `issue` and `verify` branch on the mode.

### Providers

The `providers-registry` service holds the login providers. Each entry has `enabled`, `icon` and `grantConfig`. OAuth entries also have an `authCallback` function that maps the provider profile to `username` and `email`. The registry has `getAll`, `get`, `add`, `remove` and `run`. A plugin can call `add` to register a provider. The `providers` service `connect` looks up the user by email and provider. If there is none, it creates one with the `default_role`, subject to the `allow_register` and `unique_email` settings. The OAuth flow itself is in `utils/oauth-connect`.

### Rate limit

The middleware `plugin::users-permissions.rateLimit` uses `koa2-ratelimit` on the auth routes. The key holds the request path and the IP. It also holds `body.email` on routes that use `email` as the identifier. The list `ROUTES_WITHOUT_IDENTIFIER` in `middlewares/rateLimit.js` names the routes that do not. Add a new auth route there if its body has no `email` field, or callers can vary that field to get a new key.

### Admin section

[`admin/src/index.js`](https://github.com/strapi/strapi/blob/develop/packages/plugins/users-permissions/admin/src/index.js) calls `app.createSettingSection` with four pages: Roles, Providers, Email templates and Advanced settings. Each page has its own RBAC permissions. The admin routes have `type: 'admin'`. The role, settings and permission routes use the `admin::hasPermissions` policy.

## Related

- [Authentication](../../../architecture/08-authentication.md): the session manager, the JWT modes and the Content API flow.
- [Extension points](../../../architecture/04-extension-points.md): the `register` and `bootstrap` mechanisms that this plugin uses.
- [Container and registries](../../../architecture/03-container-and-registries.md): the `auth` service and the `sanitizers` registry that `register` writes to.
- [Permissions](../../core/permissions/index.md): the engine that builds the ability from permissions.
- [Email](../../core/email/index.md): sends the reset password and confirmation emails.
- [GraphQL](../graphql/index.md): owns the extension service that the plugin uses for its schema changes.
- [Documentation](../documentation/index.md): owns the override service that receives the OpenAPI spec.

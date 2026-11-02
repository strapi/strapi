---
title: '@strapi/admin'
sidebar_label: 'admin'
description: 'React admin panel and its server part: admin users, roles, RBAC, tokens, admin authentication and admin routes.'
package: '@strapi/admin'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

`@strapi/admin` is the admin panel of Strapi. It has two parts. The admin part is a React application that runs in the browser and calls the server over HTTP. The server part runs inside the Strapi process. It owns admin users, roles, permissions, API tokens, transfer tokens, sessions and the admin authentication.

All core plugins build their screens on it. They import its components, hooks and the `StrapiApp` API from `@strapi/admin/strapi-admin`. `@strapi/core` loads the server part with the internal `admin` provider. Application developers customize the panel with the file `src/admin/app.ts` (or `app.tsx`, `app.js`, `app.jsx`).

## Key concepts

### Entry points

The package has one entry point per runtime. `./strapi-admin` is the React code, and `./strapi-admin/ee` holds the Enterprise exports. `./strapi-server` is the Node.js code. The plugin loader does not load it. The `admin` provider in `@strapi/core` requires it and loads its artifacts under the `admin::` namespace. Read [Server and admin split](../../../architecture/index.md#server-and-admin-split).

### `StrapiApp`

`StrapiApp` in [`admin/src/StrapiApp.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/StrapiApp.tsx) is the admin application object. `renderAdmin` creates it with the plugins that the admin build collects. It runs each plugin `register` and then `bootstrap`, loads the translations, and renders. During `register`, plugins call methods such as `registerPlugin`, `addMenuLink`, `addSettingsLink`, `addReducers`, `addMiddlewares`, `createHook` and `registerHook`. The app also holds the `router`, the `widgets` and the `customFields` APIs.

### Shared UI and state

`admin/src/index.ts` exports the components, hooks and features that plugins reuse: `Form`, `Table`, `Filters`, `useFetchClient`, `useRBAC`, `useAuth`, `useTracking`, `useNotification` and others. The store uses Redux Toolkit. `adminApi` is the shared RTK Query API, and plugins add their endpoints to it with `injectEndpoints`. Plugins add reducers with `addReducers`, and the store injects them at runtime. Read the hook pages [`useContentTypes`](./hooks/use-content-types.md) and [`usePersistentState`](./hooks/use-persistent-state.md).

### RBAC

Admin permissions are role based. On the server, the `permission` service holds an action provider and a condition provider, and it builds an engine on top of [`@strapi/permissions`](../permissions/index.md). Plugins register their actions with the action provider, for example in `bootstrap`. On the client, `useRBAC` and `useAuth` check the permissions of the current user. Read [Permissions introduction](./permissions/00-intro.mdx), [How permissions work](./permissions/01-how-they-work.md) and [Using permissions](./permissions/02-frontend/using-permissions.md).

### Server part

The server part exposes one `admin` router. It holds the routes for authentication, users, roles, permissions, webhooks, API tokens, admin tokens, transfer tokens and the homepage. Its `register` also adds the route that serves the built panel when `admin.serveAdminPanel` is on. It defines the `admin::` content types: `user`, `role`, `permission`, `api-token`, `api-token-permission`, `transfer-token`, `transfer-token-permission` and `session`. Its `register` sets up passport and adds three auth strategies: an admin strategy, an admin token strategy and a content API token strategy. The `data-transfer` strategy authorizes the transfer routes. Read [Authentication](../../../architecture/08-authentication.md). Code: [`server/src`](https://github.com/strapi/strapi/tree/develop/packages/core/admin/server/src).

### Enterprise code

The `ee/admin` and `ee/server` folders hold the Enterprise code, with their own `LICENSE`. The server `index.ts` merges the Enterprise admin into the base admin when `strapi.EE` is true, and it concatenates the routes. On the client, `useEnterprise` picks the Enterprise or the Community component from `window.strapi.isEE`. Audit logs and license limits live in `ee`. Read [Enterprise Edition](../../../architecture/09-enterprise-edition.md), [Audit logs](./ee/audit-logs.md) and [`useEnterprise`](./features/hooks/use-enterprise.md).

### Built-in features

The admin part ships features that plugins can use or extend. The [guided tour](./guided-tour.md) teaches new users the panel. The [NPS survey](./features/nps.md) collects feedback. The [admin telemetry](./features/telemetry.md) sends usage events from the browser with `useTracking`. The home page shows widgets, and plugins add their own with `app.widgets.register`.

## Related

- [Architecture overview](../../../architecture/index.md): the server and admin split.
- [Package map](../../../architecture/01-package-map.mdx): the plugins that depend on the admin.
- [Server lifecycle](../../../architecture/02-server-lifecycle.md): when the `admin` provider registers and bootstraps.
- [HTTP request path](../../../architecture/06-http-request-path.md): how an admin request passes the auth strategies and policies.
- [Glossary](../../../architecture/11-glossary.md): the `admin::` namespace and other terms.
- [`@strapi/core`](../core/index.md): loads the server part.
- [`@strapi/permissions`](../permissions/index.md): the engine behind admin RBAC.
- [`@strapi/content-manager`](../content-manager/index.md): the main plugin that extends the admin panel.
- [Server-side telemetry](../core/telemetry.md): the server counterpart of the admin telemetry.

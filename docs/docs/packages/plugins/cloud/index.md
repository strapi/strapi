---
title: '@strapi/plugin-cloud'
sidebar_label: 'cloud'
description: 'Admin-only plugin that adds a Deploy page with Strapi Cloud deployment instructions.'
package: '@strapi/plugin-cloud'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

`@strapi/plugin-cloud` adds a "Deploy" page to the admin panel. The page shows two ways to deploy a project to Strapi Cloud: the Cloud dashboard (marked "Recommended") and the CLI commands `strapi link` and `strapi deploy`. The plugin has admin code only. `create-strapi-app` adds it to the dependencies of each new project, and the `website` template lists it too.

## Key concepts

### Admin-only package

The `exports` field of `package.json` has only `./strapi-admin`. There is no `strapi-server` export, so the server plugin loader skips this plugin. The admin build bundles it, because it is a project dependency with `strapi.kind` set to `plugin`.

### Registration

`register(app)` in [`admin/src/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/cloud/admin/src/index.ts) does two things:

- `app.addMenuLink` adds the route `plugins/cloud` with the `Cloud` icon, the label "Deploy" and an empty `permissions` list. No RBAC action guards the page.
- `app.registerPlugin` registers the plugin with an `Initializer` component that calls `setPlugin`. `registerTrads` loads `translations/<locale>.json` and falls back to an empty object.

### Pages and components

`pages/App.tsx` routes the index path to `HomePage` and redirects to `/` when `currentEnvironment` is `production`. `HomePage` renders `CloudFeatures` and `CloudDeploy`. `CloudDeploy` has a "Cloud" tab and a "CLI" tab. `CLIDeployTabs` shows the `yarn` or `npm run` commands, with a copy button. The Cloud login and documentation links are hard-coded in `CloudDeploy.tsx`.

### Plugin name and id

The admin plugin id is `cloud` (`pluginId`). The `strapi.name` key in `package.json` is `strapi-cloud`. The admin build uses `strapi.name` as the key of the plugin in `appPlugins`. It also reads `enabled: false` under this key in `config/plugins` to skip the plugin.

### Coupling with `@strapi/admin`

Two parts of the admin panel depend on this plugin:

- `StrapiApp.tsx` in `packages/core/admin/admin/src` registers the `deploy-now` home widget when `'strapi-cloud'` is a key of `appPlugins`.
- `hideCloudDeployMenuLinkInProduction` in `utils/widgetVisibility.ts` removes the `plugins/cloud` menu link in production. It matches the path in the `CLOUD_DEPLOY_MENU_LINK` constant.

Renaming `strapi.name` or the route path breaks these two checks without a type error.

## Related

- [Architecture overview](../../../architecture/index.md): the server and admin split, and why this plugin has no server entry.
- [Cloud CLI](../../cli/cloud/index.md): the package that provides the `link` and `deploy` commands that the page shows.
- [Admin](../../core/admin/index.md): the package that owns the home widget and the menu filter.

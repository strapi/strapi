---
title: '@strapi/i18n'
sidebar_label: 'i18n'
description: 'Adds locales and localized documents to content types, with Content Manager tools, locale permissions and API support.'
package: '@strapi/i18n'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
  - The AI localization services (`ai-localizations`, `ai-translations`, `ai-localization-jobs`) are only named here. Their flow needs its own section.
  - Core code reads i18n services directly (`document-service/internationalization.ts`, `migrations/i18n.ts`). The exact call sites are not listed here.
---

## Purpose

`@strapi/i18n` lets a content type keep one version of each document per locale. The plugin loader always enables it, so every Strapi application has it. It runs on the server and in the admin panel. The server part owns the locale data, the `locale` and `localizations` attributes, the sync of shared fields and the locale permissions. The admin part adds the locale UI to the Content Manager and to the Content-Type Builder. The Document Service in `@strapi/core` also calls its services.

## Key concepts

### Localized flag

A content type is localized when `pluginOptions.i18n.localized` is `true` (`isLocalizedContentType` in `services/content-types.ts`). An attribute has its own `pluginOptions.i18n.localized` flag. `isLocalizedAttribute` also treats relations and `uid` attributes as localized. Attributes that are not localized hold the same value in every locale of a document.

### Attributes on every content type

`register` in [`server/src/register.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/i18n/server/src/register.ts) adds a `locale` string attribute and a virtual `localizations` relation to every content type. A content type that is not localized gets both as private attributes. The relation joins on `document_id` and excludes the entries already loaded. `register` runs before the database starts, so the attributes reach the schema. Read [Schema sync](../../../architecture/07-schema-sync.md) for that step.

### Locale data and default locale

The plugin adds the content type `plugin::i18n.locale` with `name` and a unique `code`. Content Manager and Content-Type Builder hide it. The default locale code is in the core store under `default_locale`. At `bootstrap`, `initDefaultLocale` creates the first locale when none exists. It uses English, or the code in `STRAPI_PLUGIN_I18N_INIT_LOCALE_CODE`.

### Sync hook and core migrations

`register` adds a handler to `strapi::content-types.afterSync`. It calls `repairPermissionsForNewlyLocalizedTypes`. Core also handles a content type that turns i18n on or off. `packages/core/core/src/migrations/i18n.ts` sets the default locale on existing rows, or deletes the non-default locales. Read [Schema sync](../../../architecture/07-schema-sync.md).

### Document Service integration

Core reads `isLocalizedContentType` and `getDefaultLocale` from this plugin to set the default `locale` on each call. `bootstrap` adds a Document Service middleware for `create`, `update`, `discardDraft` and `publish`. After `next()`, it compares the non-localized fields with their previous values. If they changed, `syncNonLocalizedAttributes` copies them to the other locales of the same document and status. When `strapi.ai.admin.isAvailable()` is true, `bootstrap` also adds a middleware that can start AI localization in the background after `create` and `update`. `register` adds the model `plugin::i18n.ai-localization-job` to the `models` registry for its jobs. Read [Document write path](../../../architecture/05-document-write-path.md).

### Permissions and routes

`bootstrap` registers the settings actions `plugin::i18n.locale.create`, `read`, `update` and `delete`. It also adds a `locales` property to the actions of content types. Handlers on the admin role service add all locales to the super admin permissions. A lifecycle subscriber on the locale model syncs those permissions after a locale is created or deleted. The admin routes manage locales, settings and AI localization jobs, and serve ISO locales and Content Manager helper data. One Content API route, `GET /locales`, lists the locales. A router middleware in `register` checks the `locale` on `POST` and `PUT` to the Content Manager collection and single type routes.

### Admin injection

[`admin/src/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/i18n/admin/src/index.ts) works through the Content Manager and Content-Type Builder plugin APIs.

- Hooks: `Admin/CM/pages/ListView/inject-column-in-table`, `Admin/CM/pages/EditView/mutate-edit-view-layout` and `ContentReleases/pages/ReleaseDetails/add-locale-in-releases`.
- Content Manager: header actions (locale picker, fill from another locale, AI status), document actions (bulk publish and unpublish, delete locale) and `injectComponent` zones in the list view.
- Content-Type Builder: a "Localization" option on content types, and a per-field option on localized types.
- A settings link `internationalization`, and an RBAC middleware for the locale.

### GraphQL support

When the `graphql` plugin exists, `register` calls `server/src/graphql.ts`. It disables mutations on the locale type, and the `locale` and `localizations` inputs on localized types. It also adds the `I18NLocaleCode` scalar and a locale argument plugin.

## Related

- [Schema sync](../../../architecture/07-schema-sync.md): the `beforeSync` and `afterSync` hooks and the migrations that i18n uses.
- [Document write path](../../../architecture/05-document-write-path.md): where Document Service middlewares run in a write.
- [Extension points](../../../architecture/04-extension-points.md): the mechanisms that this plugin uses, with its `register` as an example.
- [Content Manager](../../core/content-manager/index.md): owns the hooks, actions and injection zones that i18n fills.
- [Content-Type Builder](../../core/content-type-builder/index.md): owns the form API that i18n extends.
- [Content releases](../../core/content-releases/index.md): owns the release details hook that i18n uses.
- [GraphQL](../graphql/index.md): owns the extension service that i18n calls.

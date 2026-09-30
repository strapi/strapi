---
title: '@strapi/content-type-builder'
sidebar_label: 'content-type-builder'
description: 'Core plugin that creates and edits content types, components and folder groups from the admin panel by writing schema files.'
package: '@strapi/content-type-builder'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

`@strapi/content-type-builder` (CTB) is a core plugin that lets a developer model data in the admin panel. The server part reads the registered content types and components. It writes the changes as schema files in the application source, and then reloads the server. The admin part is the visual editor for these schemas.

The write routes work only in development, with `autoReload` on. Other packages rely on it in two ways. The Content Manager shows the content types that CTB creates. Plugins such as `i18n` extend the CTB forms through the `forms` API of the admin plugin. Application developers commit the files that CTB writes.

## Key concepts

### Schema files are the source of truth

CTB does not store schemas in the database. A content type of an API lives in `src/api/<api>/content-types/<singularName>/schema.json`. A component lives in `src/components/<category>/<name>.json`. A content type from a plugin lives under `src/extensions/<plugin>/content-types/`. At the next boot, `@strapi/core` loads these files and `@strapi/database` syncs the tables. Read [Schema sync](../../../architecture/07-schema-sync.md).

### Schema builder

`createBuilder()` in [`services/schema-builder`](https://github.com/strapi/strapi/tree/develop/packages/core/content-type-builder/server/src/services/schema-builder) copies the current `strapi.contentTypes` and `strapi.components` into an in-memory model. It offers create, edit and delete methods for both. `writeFiles()` flushes every changed schema to disk. `rollback()` restores the previous files. If a write fails, the builder rolls back and the service throws `Invalid schema edition`.

### Batch update

The admin panel does not save one attribute at a time. It sends the whole change set to `POST /content-type-builder/update-schema`. Each content type, component and attribute in the payload has an `action` (`create`, `update` or `delete`). The `schema` service applies the payload to the builder, writes the files, generates or clears API folders, and commits the folder groups last. On error, `rollbackSchemaMutation` restores the touched files. Code: [`services/schema.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/content-type-builder/server/src/services/schema.ts).

### Reload after a write

After a successful update, the `schema` controller sets `strapi.reload.isWatching` to `false` and calls `strapi.reload()` in a `setImmediate`. The reloader sends a `reload` message to the parent process of `strapi develop`, which restarts the server. The route `GET /update-schema-status` returns `isUpdating`. The admin polls it with `useServerRestartWatcher` until the server is back.

### Development-only writes

The `isDevelopmentMode` middleware guards every write route. It throws a `PolicyError` unless `autoReload` is `true`. This blocks schema changes in production, where a restart is not safe. The read routes do not use it. See [`middlewares/is-development-mode.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/content-type-builder/server/src/middlewares/is-development-mode.ts).

### API generation

When CTB creates a content type, `content-types.generateAPI` calls `@strapi/generators` to create the API folder with a controller, a service and a router. The `api-handler` service backs up and removes these folders when a content type is deleted. CTB manages only `api::` content types for deletion. See the [`@strapi/generators` package page](../../generators/generators/index.md).

### Content structure (folders)

The `content-structure` service writes the folder groups that the admin navigation shows. The file is `src/content-structure/groups.json`. It is application source, not content data. Read [Content structure file](./01-content-structure.md).

### Admin editor

The admin part registers a menu link and the plugin API `forms`, which other plugins use to add fields and validation to the CTB modals. `DataManagerProvider` keeps the working copy of the schema in a Redux slice with undo and redo (`undoRedo.ts`). Modals in `components/FormModal` edit attributes and types. The read permission is `plugin::content-type-builder.read`, which `bootstrap` registers.

## Related

- [Schema sync](../../../architecture/07-schema-sync.md): what happens to the tables after CTB writes a file.
- [Server lifecycle](../../../architecture/02-server-lifecycle.md): how the reload replays register and bootstrap.
- [Extension points](../../../architecture/04-extension-points.md): the `src/extensions` folder and plugin content types.
- [`@strapi/content-manager`](../content-manager/index.md): edits the documents of the types that CTB defines.
- [`@strapi/core`](../core/index.md): loads schema files and provides `strapi.reload`.
- [`@strapi/i18n`](../../plugins/i18n/index.md): extends the CTB forms.
- [`@strapi/database`](../database/index.md): creates the tables for the schemas.
- [`@strapi/generators`](../../generators/generators/index.md): creates the API folders.

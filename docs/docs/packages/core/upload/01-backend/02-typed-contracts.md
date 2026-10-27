---
title: Typed contracts
description: 'The service, controller, content-type schema, config, store and event contracts that the Upload plugin registers for strict types.'
tags:
  - typescript
  - backend
---

# Typed contracts

With strict types, lookups of the Upload plugin resolve to the contracts it registers in [`server/src/types/`](https://github.com/strapi/strapi/tree/develop/packages/core/upload/server/src/types). Without strict types, the lookups keep their previous types. Read [TypeScript](../../../../contributing/05-typescript.md) for the registries.

## Services

`types/services.ts` registers the twelve services of the plugin. Members that only the plugin calls are tagged `@internal`, e.g. the members of `provider`, `metrics`, `weeklyMetrics` and `extensions`. `image-manipulation.getDimensions` is not: the admin's project settings call it.

The `upload` service contract, `UploadService`, is the inferred implementation with the file reads and writes replaced. The implementation keeps its published signatures.

- Files are `File` rows of `plugin::upload.file`. `upload` resolves to `File[]`, `replace` and `updateFileInfo` to `File`, `remove` to `File | null`, and `findOne` to `File | null`.
- `upload` and `replace` take `UploadInputFile`: the service reads only these fields, so a hand-built file is accepted.
- `findMany` and `findAndCountPage` take `FilesQuery`: the REST query params of `@strapi/utils` (`queryParams.Params`) with the Content API's nested `pagination`. `findPage` takes `queryParams.Params`. Their results hold `File` rows.
- `getSettings` and `getConfiguration` read the stored settings and view configuration, or `null` before the first write. `setSettings` and `setConfiguration` take the stored shape.

## Controllers

`types/controllers.ts` registers the seven controllers: `admin-file`, `admin-folder`, `admin-folder-file`, `admin-settings`, `admin-upload`, `content-api` and `view-configuration`.

- The admin, Content API and view configuration routes are checked against them with `Core.RouterInputFor`.
- `content-api` is a factory, checked with `Core.ControllerFactory`.
- Actions that no route references, because `upload` delegates to them (`uploadFiles`, and the Content API `updateFileInfo` and `replaceFile`), are tagged `@internal`.

## Content-type schemas

`types/content-types.ts` declares the schemas of `plugin::upload.file` (`FileSchema`) and `plugin::upload.folder` (`FolderSchema`) in `PackageContentTypeSchemas`, as type generation writes them for an application that does not extend them. Plugin code compiled without type generation then reads these two content types precisely through the Document Service; in an application, the generated schemas replace them. Keep the declarations in sync with `content-types/file.ts` and `content-types/folder.ts`: the drift check of `examples/strict-types` fails when they differ.

## Config, stores and events

- `plugin::upload` resolves to the plugin config merged with its defaults.
- Five core store rows are registered: `plugin_upload_settings`, `plugin_upload_view_configuration`, `plugin_upload_metrics`, `plugin_upload_api-folder` and `plugin_upload_media_library_default_notice`.
- The `media.*` events carry a `File`, and the `media-folder.*` events a `Folder`, or every deleted `Folder` for `media-folder.delete`.

## Not typed

- `strapi.plugin('upload').provider` has no contract: it stays `any`. Read [Providers](./00-providers.md).
- The Upload plugin calls the Documentation plugin's `override` service through a local type in `server/src/register.ts`, because Documentation is an optional plugin it does not depend on.

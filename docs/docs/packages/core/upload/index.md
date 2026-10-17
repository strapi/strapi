---
title: '@strapi/upload'
sidebar_label: 'upload'
description: 'Upload plugin: the Media Library, file and folder storage, image processing, and upload providers.'
package: '@strapi/upload'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
  - The Media Library, AI metadata, MCP tools and GraphQL extension are not documented in this page beyond a mention. Add pages for them.
---

## Purpose

`@strapi/upload` is the plugin that stores files for a Strapi application. It provides the Media Library in the admin panel, the upload routes of the admin API and the Content API, and the file and folder content types. It processes images and hands the files to an upload provider.

The plugin has a server part (`strapi-server`), an admin part (`strapi-admin`) and shared code (`shared/`, exported as `./_internal/shared`). The plugin loader always enables it. The `media` attribute of any content type points to its files. The provider packages under `packages/providers/upload-*` implement the storage.

## Key concepts

### Content types

The plugin declares two content types: `plugin::upload.file` and `plugin::upload.folder`. Both are hidden from the content manager and the content-type builder. A file has a morph relation named `related` to the entries that use it. A folder has `parent`, `children` and `files` relations, and a unique `path` and `pathId`. The relations build the folder tree of the Media Library.

### Upload provider

`register` in `server/src/register.ts` creates the provider and stores it in `strapi.plugin('upload').provider`. `createProvider` reads `provider`, `providerOptions` and `actionOptions` from the `plugin::upload` config. The default provider is `local`. It loads `@strapi/provider-upload-<name>`, or the module of that name, and calls its `init(providerOptions)`. The provider must implement `delete` and either `upload` or `uploadStream`. See [Providers](./01-backend/00-providers.md).

### Upload flow

The controllers call `prepareUploadRequest` to validate the MIME types before any work starts. The `upload` service in `server/src/services/upload.ts` then builds the file info, optimizes images and checks the size limit. For images, it prepares the original, thumbnail and responsive formats before starting provider writes. Once writes begin, the service waits for every operation to settle. If a provider write or the subsequent database create fails, it makes a best-effort attempt to remove the uploaded objects. It logs each operation's outcome when a provider batch partially fails. It saves the `plugin::upload.file` entry before emitting `media.create`; a post-commit event failure does not remove objects referenced by the database.

Replacement keeps the existing provider key and URL behavior. Formats that the new file no longer needs are deleted only after the database update commits, and cleanup failures are logged without changing the committed replacement into a failed result. Deletion still cannot be transactional across arbitrary providers and the database: partial provider deletion is logged with per-object outcomes and leaves the database record in place for recovery. The option `concurrentUploadSize` sets how many files one request processes at the same time.

### MIME type validation

`server/src/utils/mime-validation.ts` decides whether a file is accepted. It compares the declared type, the type from the file extension and the type detected from the content against the `allowedTypes` and `deniedTypes` lists. See [MIME type validation](./01-backend/01-mime-validation.md).

### Image processing

The `image-manipulation` service uses `sharp`. It checks that a file is a valid image, optimizes it, and generates a thumbnail and the responsive formats. The stored settings `sizeOptimization`, `responsiveDimensions` and `autoOrientation` control these steps. `bootstrap` writes their defaults into the plugin store.

### Private providers and signed URLs

A provider can return `true` from `isPrivate()` and implement `getSignedUrl(file)`. In that case, `signFileUrlsOnDocumentService` adds a document service middleware. The middleware signs the file URLs in the results and removes signatures from the data that callers write.

### Admin part

The admin entry adds the Media Library menu link and its settings page, registers the `media` field input, and registers the `media-library` dialog component. `bootstrap` on the server registers the permission actions, for example `plugin::upload.assets.create`, and the webhook events. The redesigned Media Library is the default. The `useLegacyMediaLibrary` key in `config/features` selects the legacy one from `admin/src/legacy`.

## Related

- [Extension points](../../../architecture/04-extension-points.md): the plugin loader enables this plugin, and the plugin adds a document middleware.
- [Document write path](../../../architecture/05-document-write-path.md): the signing middleware runs in the Document Service chain.
- [`@strapi/provider-upload-local`](../../providers/upload-local/index.md): the default provider.
- [`@strapi/provider-upload-aws-s3`](../../providers/upload-aws-s3/index.md): a remote provider.
- [`@strapi/provider-upload-cloudinary`](../../providers/upload-cloudinary/index.md): a remote provider.
- [`@strapi/admin`](../admin/index.md): hosts the field registry and the menu API that the admin part uses.
- [`@strapi/utils`](../utils/index.md): provides the file helpers and error classes.

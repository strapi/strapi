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

`register` in `server/src/register.ts` creates the provider and stores it in `strapi.plugin('upload').provider`. `createProvider` reads `provider`, `providerOptions` and `actionOptions` from the `plugin::upload` config. The default provider is `local`. It loads `@strapi/provider-upload-<name>`, or the module of that name, and calls its `init(providerOptions)`. The provider must implement `delete` and either `upload` or `uploadStream`. The contract is `Providers.Upload.Factory` and `Providers.Upload.Provider` in `@strapi/types`. The official providers check their export against it with `satisfies Providers.Upload.Factory<Options>`, and export their `name`, e.g. `aws-s3`. See [`providers/upload.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/types/src/providers/upload.ts) and [Providers](./01-backend/00-providers.md).

### Upload flow

The controllers call `prepareUploadRequest` to validate the MIME types before any work starts. The `upload` service in `server/src/services/upload.ts` then builds the file info, optimizes images and checks the size limit. It sends the file to the provider service, which prefers `uploadStream` over `upload`. It saves the `plugin::upload.file` entry and emits a `media.create` event, or `media.update` and `media.delete` for the other actions. The option `concurrentUploadSize` sets how many files one request processes at the same time.

### File types

The file changes shape as it moves through the upload flow. Each phase has its own type in `server/src/types.ts`:

- `InputFile`: a multipart part parsed by formidable, or a file fetched from a URL. Its content is in a temporary file at `filepath`, and `size` is in bytes.
- `UploadableFile`: the file after `enhanceAndValidateFile`. It has a `name`, `hash`, `ext` and `mime`, its `size` is in kilobytes, and `getStream()` reads it. Thumbnails and responsive formats are uploadable files too.
- `Providers.Upload.PendingFile` and `Providers.Upload.UploadedFile` (from `@strapi/types`): what the provider receives before and after it stores the file. An uploadable file is passed as a pending file.
- `FileEntity`: a row of `plugin::upload.file`. `FileFormat` is one entry of its `formats`.
- `SignableFile`: what `signFileUrls` accepts. Besides file entities, it signs files built from bare URLs found in rich text, which only have `url`, `hash`, `ext` and `provider`.

`File` is a deprecated alias of `FileEntity`.

`getProvider()` in `server/src/utils` returns `strapi.plugin('upload').provider` typed as `UploadProvider`: the provider instance with the defaults of `checkFileSize`, `getSignedUrl` and `isPrivate`.

The MIME type validation in `server/src/utils/mime-validation.ts` still accepts any object, because it also reads legacy file shapes. The `File` type in `shared/contracts/files.ts` is the file as the admin API returns it, and is separate from `FileEntity`.

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

---
title: Data fetching
description: 'RTK Query in the Media Library admin: the shared API slice, cache tags, global endpoint names and file uploads.'
tags:
  - frontend
---

# Data fetching

The Media Library admin fetches data with RTK Query. The endpoints are in [`services/`](https://github.com/strapi/strapi/tree/develop/packages/core/upload/admin/src/services).

## One API slice

[`services/api.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/services/api.ts) builds `uploadApi` from the `adminApi` slice of `@strapi/admin`:

```ts
const uploadApi = adminApi
  .enhanceEndpoints({ addTagTypes: ['Asset', 'Folder'] })
  .injectEndpoints({ endpoints: (builder) => ({ ... }) });
```

`assets.ts`, `folders.ts` and `settings.ts` inject their endpoints into `uploadApi`. Add new endpoints the same way. Do not call `createApi`: a separate slice has its own cache, so its mutations cannot invalidate the queries of `uploadApi`.

An endpoint that the upload flows in `api.ts` dispatch with `initiate()` must live in `api.ts`. `assets.ts` already imports from `api.ts`, so defining it in `assets.ts` would create a circular import. `generateAiMetadata` is defined in `api.ts` for this reason, and `assets.ts` re-exports its hook.

## Endpoint names are global

Every plugin injects its endpoints into the same `adminApi`. The slice has one registry of endpoints, keyed by name. `injectEndpoints` keeps the first endpoint registered under a name and ignores the next ones. Development builds log an error for the duplicate, production builds ignore it silently.

The i18n plugin registers `getSettings`. For that reason, the Media Library endpoint is `getUploadSettings`. With the generic name, the hook could resolve to the i18n endpoint, depending on the order in which the modules load. Give new endpoints a name that includes their resource.

## Cache tags

| Tag                                   | Provided by                                       | Invalidate it when                                                     |
| ------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| `{ type: 'Asset', id }`               | `getAsset`, and each item of `getAssets`          | The asset changes.                                                     |
| `{ type: 'Asset', id: 'LIST' }`       | `getAssets`                                       | A list of assets can change: upload, update, replace, move or delete.  |
| `{ type: 'Folder', id }`              | `getFolders`, `getAllFolders` and `getFolder`     | The folder changes.                                                    |
| `{ type: 'Folder', id: 'LIST' }`      | `getFolders`, `getAllFolders` and `getFolder`     | A list of folders changes, or the number of files in a folder changes. |
| `{ type: 'Folder', id: 'STRUCTURE' }` | `getFolderStructure` (`/upload/folder-structure`) | A folder is created, renamed, moved or deleted.                        |

Two rules are easy to miss:

- Uploading, moving or deleting an asset changes the file count of a folder. Invalidate `{ type: 'Folder', id: 'LIST' }` too. Every upload mutation in `api.ts` does. `getFolder` also provides the `LIST` tag for this reason, so a mutation does not need the id of the folder.
- `getFolderStructure` only has the `STRUCTURE` tag. The folder tree in the sidebar, the bulk move dialog, drag and drop, and the folder breadcrumbs of the picker read it. A mutation that changes folders and does not invalidate it leaves old folders in all of them.

Inside a `map`, write the tag type with `as const`, for example `{ type: 'Asset' as const, id }`. Without it, TypeScript widens the type to `string`, which is not a valid tag type.

## The `File` name clash

`shared/contracts/files.ts` exports a `File` type for the file entity. `services/assets.ts` and `services/uploadFileViaXHR.ts` import it as `File`, which shadows the browser `File` in those modules. There, type a browser file as `globalThis.File`, as `ReplaceAssetArgs` in `services/assets.ts` does. `services/api.ts` avoids the clash another way: it imports the contract type as `UploadedFile`.

## Uploads

- `updateAsset` and `replaceAsset` in `services/assets.ts` build a `FormData` in `query` and use the default base query. They send one request and need no progress.
- `uploadFiles`, `uploadFromUrls`, `uploadFileSilently`, `retryCancelledFiles` and `retryUploadFile` in `services/api.ts` use a `queryFn` instead. They send one XHR request per file, or read a stream of server-sent events for URL imports. All but `uploadFileSilently` report progress to the `uploadProgress` slice. [Uploads](./04-uploads.md) describes them.

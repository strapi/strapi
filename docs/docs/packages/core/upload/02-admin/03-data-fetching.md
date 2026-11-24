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

## Endpoint names are global

Every plugin injects its endpoints into the same `adminApi`. The slice has one registry of endpoints, keyed by name. `injectEndpoints` keeps the first endpoint registered under a name and silently ignores the next ones.

The i18n plugin registers `getSettings`. For that reason, the Media Library endpoint is `getUploadSettings`. With the generic name, the hook could resolve to the i18n endpoint, depending on the order in which the modules load. Give new endpoints a name that includes their resource.

## Cache tags

| Tag                                   | Provided by                                       | Invalidate it when                                                     |
| ------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| `{ type: 'Asset', id }`               | `getAsset`, and each item of `getAssets`          | The asset changes.                                                     |
| `{ type: 'Asset', id: 'LIST' }`       | `getAssets`                                       | A list of assets can change: create, update, replace, move or delete.  |
| `{ type: 'Folder', id }`              | `getFolders`, `getAllFolders` and `getFolder`     | The folder changes.                                                    |
| `{ type: 'Folder', id: 'LIST' }`      | `getFolders`, `getAllFolders` and `getFolder`     | A list of folders changes, or the number of files in a folder changes. |
| `{ type: 'Folder', id: 'STRUCTURE' }` | `getFolderStructure` (`/upload/folder-structure`) | A folder is created, renamed, moved or deleted.                        |

Two rules are easy to miss:

- Moving or deleting an asset changes the file count of a folder. Invalidate `{ type: 'Folder', id: 'LIST' }` too. `getFolder` also provides the `LIST` tag for this reason, so a mutation does not need the id of the folder.
- The folder tree in the sidebar reads `getFolderStructure`, which only has the `STRUCTURE` tag. A mutation that changes folders and does not invalidate it leaves the old folders in the tree.

Inside a `map`, write the tag type with `as const`, for example `{ type: 'Asset' as const, id }`. Without it, TypeScript widens the type to `string`, which is not a valid tag type.

## The `File` name clash

`shared/contracts/files.ts` exports a `File` type for the file entity. The service files import it, and it shadows the browser `File` in those modules. Type a browser file as `globalThis.File`, as `ReplaceAssetArgs` in `services/assets.ts` does.

## Uploads

- `updateAsset` and `replaceAsset` in `services/assets.ts` build a `FormData` in `query` and use the default base query. They send one request and need no progress.
- `uploadFiles` in `services/api.ts` sends new files. Its `queryFn` sends one XHR request per file (`services/uploadFileViaXHR.ts`) through a worker pool. The `concurrency` argument sets the number of parallel requests, 1 by default. XHR exposes `upload.onprogress`, which gives the progress of each file. The progress goes to the `uploadProgress` slice in `store/uploadProgress.ts`, which the upload progress dialog reads.
- `uploadFileSilently` uploads one file without the upload progress dialog. The crop editor uses it to save a cropped copy.

import { z } from '@strapi/utils';

/**
 * The exhaustive set of asset fields the MCP surface may expose — an allowlist, for the reasons
 * in `sanitizeMediaAsset`. A field added to the file content-type stays invisible to MCP until
 * it is added both here and there.
 */
export const mediaAssetOutputSchema = z.object({
  id: z.number().describe('Numeric asset id — the canonical identifier for this asset.'),
  name: z.string(),
  alternativeText: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  url: z.string().describe('Public (or signed, for private providers) URL of the asset.'),
  mime: z.string().describe('Mime type, e.g. "image/png".'),
  size: z.number().describe('File size in kilobytes, as stored by Strapi.'),
  width: z.number().nullable().optional().describe('Pixel width, images only.'),
  height: z.number().nullable().optional().describe('Pixel height, images only.'),
  ext: z.string().nullable().optional().describe('File extension including the dot, e.g. ".png".'),
  folder: z
    .object({
      id: z.number(),
      name: z.string(),
    })
    .nullable()
    .optional()
    .describe('Containing folder, or null when the asset sits at the media library root.'),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const mediaGetAssetOutputSchema = z.object({
  data: mediaAssetOutputSchema.nullable(),
});

export const mediaListAssetsOutputSchema = z.object({
  results: z.array(mediaAssetOutputSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    pageCount: z.number(),
    total: z.number(),
  }),
});

/**
 * Folder tree node. `children` is recursive and unbounded in depth, so it is typed lazily.
 */
export type MediaFolderNode = {
  id: number;
  name: string;
  children: MediaFolderNode[];
};

export const mediaFolderNodeSchema: z.ZodType<MediaFolderNode> = z.lazy(() =>
  z.object({
    id: z.number(),
    name: z.string(),
    children: z.array(mediaFolderNodeSchema),
  })
);

export const mediaListFoldersOutputSchema = z.object({
  data: z.array(mediaFolderNodeSchema).describe('Nested folder structure, roots first.'),
});

/**
 * `media_update_asset` output — the updated asset in the same shape the read tools return,
 * so an agent can confirm the write without a follow-up `media_get_asset` call.
 */
export const mediaUpdateAssetOutputSchema = z.object({
  data: mediaAssetOutputSchema,
});

/**
 * A folder as returned by the write tools.
 *
 * Like the asset schema this is an ALLOWLIST: `path` and `pathId` are internal materialized-path
 * bookkeeping and stay invisible to MCP clients, matching what `media_list_folders` already exposes.
 */
export const mediaFolderOutputSchema = z.object({
  id: z.number().describe('Numeric folder id — the canonical identifier for this folder.'),
  name: z.string(),
  parent: z
    .object({
      id: z.number(),
      name: z.string().optional(),
    })
    .nullable()
    .optional()
    .describe(
      'Containing folder, or null when the folder sits at the media library root. Absent when this response did not load the relation — absent means unknown, not root.'
    ),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const mediaCreateFolderOutputSchema = z.object({
  data: mediaFolderOutputSchema,
});

export const mediaRenameFolderOutputSchema = z.object({
  data: mediaFolderOutputSchema,
});

export const mediaMoveFolderOutputSchema = z.object({
  data: mediaFolderOutputSchema,
});

/**
 * `media_delete_folder` output — the same shape for both branches, so an agent reads one contract.
 *
 * `dryRun` echoes which branch ran: on true the counts are what *would* be removed and nothing
 * was touched; on false they are what actually was. Echoing it back means the agent can tell a
 * preview from a completed deletion without tracking what it sent.
 *
 * There is no "skipped ids" field: an id that does not resolve to a folder rejects the whole
 * call, so every id in the request is accounted for by `folders` on any successful response.
 */
export const mediaDeleteFolderOutputSchema = z.object({
  dryRun: z
    .boolean()
    .describe(
      'True when this was a preview and NOTHING was deleted. False when the deletion was performed.'
    ),
  folders: z
    .array(mediaFolderOutputSchema)
    .describe('The folders matched by the given ids (the roots of the cascade).'),
  totalFolderNumber: z
    .number()
    .describe(
      'Total folders affected, including the matched folders themselves and every descendant.'
    ),
  totalFileNumber: z.number().describe('Total files affected, across the whole cascade.'),
});

/**
 * `media_move_assets` output — a per-id report rather than a single verdict.
 *
 * A bad id among good ones does not roll back the valid moves (see the handler), so the response
 * has to say which ids moved and which did not: an agent that only learned "the call failed"
 * would either retry moves that already happened or abandon ones that did. `moved` and `failed`
 * together account for every id in the request, on every successful response — including one
 * where `moved` is empty because no id resolved.
 *
 * `moved` carries the full asset in the same shape the read tools return, so the new folder can
 * be confirmed without a follow-up `media_get_asset`.
 */
export const mediaMoveAssetsFailureSchema = z.object({
  id: z.number().describe('The requested asset id that was not moved.'),
  reason: z
    .string()
    .describe('Why this id was not moved — a missing asset, or one this token may not edit.'),
});

export const mediaMoveAssetsOutputSchema = z.object({
  destinationFolder: z
    .object({
      id: z.number(),
      name: z.string().optional(),
    })
    .nullable()
    .describe(
      'The destination folder, or null when the assets were moved to the media library root.'
    ),
  moved: z
    .array(mediaAssetOutputSchema)
    .describe('The assets that were moved, in their new location.'),
  failed: z
    .array(mediaMoveAssetsFailureSchema)
    .describe(
      'The ids that were not moved, each with a reason. The moves reported in `moved` still happened — retry only these.'
    ),
});

/**
 * `media_delete_assets` output — one contract for both branches, with a per-id account of every
 * requested id.
 *
 * `dryRun` echoes which branch ran: on true `deleted` is what *would* be removed and nothing was
 * touched; on false it is what actually was. Echoing it back means an agent can tell a preview
 * from a completed deletion without tracking what it sent — the difference matters more here
 * than anywhere else in this surface, because one branch is irreversible.
 *
 * `deleted` carries the full asset rather than a bare id, so the agent can report what it
 * destroyed after the row is gone and no read can recover it. On a dry run it is the same shape,
 * which is exactly what makes the preview a confirmation an agent can act on.
 *
 * Unlike `media_delete_folder`, an unresolvable id does NOT reject the call: deletions are performed
 * per asset and reported per id, so a bad id among good ones neither rolls back the valid
 * deletions nor stops them from happening. `deleted` and `failed` together account for every id
 * in the request, on every successful response.
 */
export const mediaDeleteAssetsFailureSchema = z.object({
  id: z.number().describe('The requested asset id that was not deleted.'),
  reason: z
    .string()
    .describe(
      'Why this id was not deleted — a missing asset (possibly a folder id), or one this token may not delete.'
    ),
});

export const mediaDeleteAssetsOutputSchema = z.object({
  dryRun: z
    .boolean()
    .describe(
      'True when this was a preview and NOTHING was deleted. False when the deletion was performed and is irreversible.'
    ),
  deleted: z
    .array(mediaAssetOutputSchema)
    .describe(
      'On a dry run, the assets that WOULD be permanently deleted. On a real run, the assets that were deleted — they no longer exist and cannot be read back.'
    ),
  failed: z
    .array(mediaDeleteAssetsFailureSchema)
    .describe(
      'The ids that were not deleted, each with a reason. On a real run the deletions reported in `deleted` still happened — retry only these.'
    ),
  totalFileNumber: z
    .number()
    .describe(
      'How many assets are in `deleted` — the count that WOULD be removed on a dry run, or that was removed on a real one.'
    ),
});

import { z } from '@strapi/utils';

import { ALLOWED_SORT_STRINGS } from '../../constants';

/**
 * Media files and folders are NOT documents: they are plain entities keyed by a numeric `id`,
 * so there is no `documentId` and no draft/published pair. Every media identifier in the MCP
 * surface is this numeric id.
 */
export const mediaIdSchema = z
  .number()
  .int()
  .min(1)
  .describe(
    'Numeric media asset id (e.g. 42). Media files are not documents — they have no documentId and no draft/published versions.'
  );

export const folderIdSchema = z
  .number()
  .int()
  .min(1)
  .describe('Numeric media folder id (e.g. 3). Folders are not documents — they use numeric ids.');

export const pageSchema = z
  .number()
  .int()
  .min(1)
  .optional()
  .describe('Page number (1-indexed, default: 1).');

export const pageSizeSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe('Items per page (default: 25, max: 100).');

/**
 * Sort is constrained to the same whitelist the Media Library admin uses, so MCP callers
 * cannot sort by private columns such as `folderPath`.
 */
export const sortSchema = z
  .enum(ALLOWED_SORT_STRINGS as [string, ...string[]])
  .optional()
  .describe(
    `Sort expression. One of: ${ALLOWED_SORT_STRINGS.join(', ')}. Defaults to "createdAt:DESC".`
  );

export const mediaListAssetsInputSchema = z.object({
  folderId: folderIdSchema
    .optional()
    .describe(
      'Only return assets directly inside this folder. Omit for every folder; pass null for assets at the media library root.'
    )
    .nullable(),
  mime: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Filter by mime type prefix or exact value (e.g. "image", "image/png", "application/pdf").'
    ),
  name: z
    .string()
    .min(1)
    .optional()
    .describe('Case-insensitive substring search on the asset name.'),
  page: pageSchema,
  pageSize: pageSizeSchema,
  sort: sortSchema,
});

export const mediaGetAssetInputSchema = z.object({
  id: mediaIdSchema,
});

export const mediaListFoldersInputSchema = z.object({});

const FOLDER_INPUT_KEYS = ['folder', 'folderId', 'folderPath'] as const;

/**
 * `media_update_asset` input — the only writable asset metadata.
 *
 * `.strict()` turns an out-of-scope field into an error rather than a silent no-op. The custom
 * object error directs folder-shaped inputs to `media_move_assets`; other unknown keys are named by
 * Zod's default error, so the agent can correct the call without a round-trip.
 *
 * The "at least one field" rule is enforced in the handler, not here: a `.refine()` would turn
 * this into a `ZodEffects`, which the MCP tool registry cannot expose as an input schema.
 */
export const mediaUpdateAssetInputSchema = z
  .object(
    {
      id: mediaIdSchema,
      name: z
        .string()
        .min(1)
        .optional()
        .describe(
          'New asset name as shown in the Media Library. Renames the entry only — the stored file and its URL are unchanged.'
        ),
      alternativeText: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Alt text used by the frontend for accessibility. Pass null to clear it; the field then reads back as an empty string.'
        ),
      caption: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Caption shown alongside the asset. Pass null to clear it; the field then reads back as an empty string.'
        ),
    },
    {
      error(issue) {
        if (
          issue.code === 'unrecognized_keys' &&
          FOLDER_INPUT_KEYS.some((key) => issue.keys.includes(key))
        ) {
          return 'Folder changes are not supported by media_update_asset. Use media_move_assets to move an asset between folders.';
        }

        return undefined;
      },
    }
  )
  .strict();

/**
 * Folder name, validated to the same rules as the admin folder controller
 * (`controllers/validation/admin/folder.ts`): non-empty, no slashes, no surrounding whitespace.
 *
 * Enforcing the shape here rather than only in the handler means the agent is corrected by the
 * tool schema — before a call is made — instead of by a service-level error afterwards. The
 * uniqueness rule cannot live here: it needs a DB read, so it stays in the handler.
 */
export const folderNameSchema = z
  .string()
  .min(1)
  .regex(/^[^/]+$/, 'Folder name cannot contain slashes.')
  .regex(/^(?! ).+(?<! )$/, 'Folder name cannot start or end with a whitespace.')
  .describe(
    'Folder name as shown in the Media Library. Cannot contain slashes or start/end with a space, and must be unique among its siblings.'
  );

/**
 * `parent` is nullable-with-meaning: null is the media library root, an id nests the folder.
 * The two are distinct from *omitting* the key, which `media_move_folder` forbids (a move needs a
 * destination) and `media_create_folder` reads as the root.
 */
const parentFolderIdSchema = folderIdSchema
  .nullable()
  .describe(
    'Numeric id of the containing folder. Pass null for the media library root. Use media_list_folders to discover folder ids.'
  );

export const mediaCreateFolderInputSchema = z
  .object({
    name: folderNameSchema,
    parent: parentFolderIdSchema
      .optional()
      .describe(
        'Numeric id of the parent folder. Omit or pass null to create the folder at the media library root.'
      ),
  })
  .strict();

/**
 * `media_rename_folder` deliberately takes no `parent`: renaming and moving are separate tools, so an
 * agent picks by intent. A `parent` here is a sign the caller wanted `media_move_folder`, and the
 * custom object error says so rather than letting Zod's generic "unrecognized key" stand.
 */
export const mediaRenameFolderInputSchema = z
  .object(
    {
      id: folderIdSchema,
      name: folderNameSchema,
    },
    {
      error(issue) {
        if (issue.code === 'unrecognized_keys' && issue.keys.includes('parent')) {
          return 'media_rename_folder only changes a folder name. Use media_move_folder to change a folder location.';
        }

        return undefined;
      },
    }
  )
  .strict();

/**
 * `media_move_folder` requires `parent` — including an explicit null for the root. Making it required
 * is what keeps a mistyped move from silently becoming a no-op update.
 */
export const mediaMoveFolderInputSchema = z
  .object(
    {
      id: folderIdSchema,
      parent: parentFolderIdSchema,
    },
    {
      error(issue) {
        if (issue.code === 'unrecognized_keys' && issue.keys.includes('name')) {
          return 'media_move_folder only changes a folder location. Use media_rename_folder to change a folder name.';
        }

        return undefined;
      },
    }
  )
  .strict();

/**
 * `media_delete_folder` input.
 *
 * `dryRun` defaults to true: the safe branch is the one an agent gets when it omits the flag, so
 * a destructive cascade is never the path of least resistance (the initiative card's mitigation
 * for irreversible MCP operations). Deleting requires saying `dryRun: false` on purpose.
 *
 * That default lives in the handler (`folder-handlers.ts`, `dryRun = true`), NOT in this schema:
 * `.default(true)` here is deliberately avoided so an omitted flag is a preview no matter how a
 * client serialises the advertised schema. The `.describe()` text below is what tells an agent
 * the default, so the two must be kept in step — do not "fix" this to `.default(true)`.
 */
export const mediaDeleteFolderInputSchema = z
  .object({
    ids: z
      .array(folderIdSchema)
      .min(1)
      .max(100)
      .describe(
        'Numeric ids of the folders to delete (1-100). FOLDER ids only — asset ids are a separate namespace of integers and are rejected here; use media_delete_assets for assets.'
      ),
    dryRun: z
      .boolean()
      .optional()
      .describe(
        'When true (the default), nothing is deleted and the tool only reports how many folders and files WOULD be removed. Pass false to actually perform the irreversible deletion.'
      ),
  })
  .strict();

/**
 * `media_move_assets` input.
 *
 * Bulk by design: an agent reorganising a library moves many assets at once, and one call with a
 * per-id report is cheaper and easier to recover from than N sequential calls. There is no
 * single-asset variant — the array length is the only difference, and a second tool would add a
 * choice without removing a mistake. The admin REST API agrees: `/actions/bulk-move` is the only
 * move route.
 *
 * `folder` is required, including an explicit null for the root, for the same reason `media_move_folder`
 * requires `parent`: a move needs a destination, and an omitted key would silently become a no-op.
 *
 * ASSET ids only, and the schema CANNOT enforce it. Asset ids and folder ids are independently
 * numbered, so the same integer routinely names both; the handler resolves ids in the file table,
 * which means a folder id whose number collides with an asset moves that asset — and reports it
 * as a success. Only an id matching no asset at all is reported as failed.
 *
 * This is an accepted risk, not an oversight: with a bare `ids: number[]` there is no way for the
 * caller to say which namespace it meant, and refusing every colliding id would make those assets
 * permanently unmovable over MCP. The mitigation is the tool description. The durable fix is
 * namespaced handles (`asset:1` / `folder:1`) across the whole media surface, which is a breaking
 * change to the read tools and belongs to its own ticket.
 */
export const mediaMoveAssetsInputSchema = z
  .object(
    {
      ids: z
        .array(mediaIdSchema)
        .min(1)
        .max(100)
        .describe(
          'Numeric ids of the assets to move (1-100). ASSET ids only, taken from media_list_assets or media_get_asset — never from media_list_folders. Folder ids are numbered separately and the same number often names both an asset and a folder, so a folder id here moves the asset sharing that number; use media_move_folder to move a folder.'
        ),
      folder: folderIdSchema
        .nullable()
        .describe(
          'Numeric id of the destination folder. Pass null to move the assets to the media library root. Required — including the explicit null — so a move always names a destination. Use media_list_folders to discover folder ids.'
        ),
    },
    {
      error(issue) {
        if (
          issue.code === 'unrecognized_keys' &&
          issue.keys.some((key) => key === 'id' || key === 'fileIds')
        ) {
          return 'media_move_assets moves assets in bulk: pass `ids` as an array of numeric asset ids, even for a single asset.';
        }

        if (issue.code === 'unrecognized_keys' && issue.keys.includes('folderIds')) {
          return 'media_move_assets moves assets only. Use media_move_folder to move a folder.';
        }

        return undefined;
      },
    }
  )
  .strict();

/**
 * `media_delete_assets` input.
 *
 * Bulk-only, like `media_move_assets`: the admin REST API has no single-asset delete route either
 * (`/actions/bulk-delete` is the only one), and single-vs-bulk is an array length rather than a
 * distinction an agent can get wrong.
 *
 * `dryRun` defaults to true in the handler, not here — same reasoning as `media_delete_folder`: the
 * safe branch is what an agent gets when it omits the flag, so an irreversible delete is never
 * the path of least resistance. A schema-level `.default(true)` would publish as a JSON Schema
 * default a client could serialise away.
 *
 * ASSET ids only, and the schema CANNOT enforce it. Asset ids and folder ids are independently
 * numbered, so the same integer routinely names both; the handler resolves ids in the file table,
 * which means a folder id whose number collides with an asset deletes that asset. Only an id
 * matching no asset at all is reported as failed.
 *
 * This is an accepted risk, not an oversight: with a bare `ids: number[]` there is no way for the
 * caller to say which namespace it meant, and refusing every colliding id would make those assets
 * permanently undeletable over MCP. The mitigations are the dry run and the tool description. The
 * durable fix is namespaced handles (`asset:1` / `folder:1`) across the whole media surface, which
 * is a breaking change to the read tools and belongs to its own ticket.
 */
export const mediaDeleteAssetsInputSchema = z
  .object(
    {
      ids: z
        .array(mediaIdSchema)
        .min(1)
        .max(100)
        .describe(
          'Numeric ids of the assets to delete (1-100). ASSET ids only, taken from media_list_assets or media_get_asset — never from media_list_folders. Folder ids are numbered separately and the same number often names both an asset and a folder, so a folder id here deletes the asset sharing that number; use media_delete_folder for folders.'
        ),
      dryRun: z
        .boolean()
        .optional()
        .describe(
          'When true (the default), NOTHING is deleted and the tool only reports which assets WOULD be permanently removed. Pass false to actually perform the irreversible deletion.'
        ),
    },
    {
      error(issue) {
        if (
          issue.code === 'unrecognized_keys' &&
          issue.keys.some((key) => key === 'id' || key === 'fileIds')
        ) {
          return 'media_delete_assets deletes assets in bulk: pass `ids` as an array of numeric asset ids, even for a single asset.';
        }

        if (issue.code === 'unrecognized_keys' && issue.keys.includes('folderIds')) {
          return 'media_delete_assets deletes assets only. Use media_delete_folder to delete a folder.';
        }

        return undefined;
      },
    }
  )
  .strict();

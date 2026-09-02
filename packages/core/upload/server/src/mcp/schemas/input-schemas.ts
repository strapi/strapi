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

export const listMediaInputSchema = z.object({
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

export const getMediaInputSchema = z.object({
  id: mediaIdSchema,
});

export const listFoldersInputSchema = z.object({});

/**
 * `update_media` input — the only writable asset metadata.
 *
 * `.strict()` is what turns an out-of-scope field into an actionable error rather than a silent
 * no-op: an agent that guesses `folder` or `url` is told the key is unrecognised instead of
 * getting a success response with nothing changed. The descriptions name the alternative
 * (`move_media`) or the reason a field is not writable, so the agent can recover without
 * a round-trip.
 *
 * The "at least one field" rule is enforced in the handler, not here: a `.refine()` would turn
 * this into a `ZodEffects`, which the MCP tool registry cannot expose as an input schema.
 */
export const updateMediaInputSchema = z
  .object({
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
      .describe('Alt text used by the frontend for accessibility. Pass null to clear it.'),
    caption: z
      .string()
      .nullable()
      .optional()
      .describe('Caption shown alongside the asset. Pass null to clear it.'),
  })
  .strict();

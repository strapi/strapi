import { z } from '@strapi/utils';

/**
 * The exhaustive set of asset fields the MCP surface may expose.
 *
 * This is deliberately an ALLOWLIST rather than a denylist: the file content-type carries
 * `provider_metadata` (provider-specific, may hold credentials or private keys), `provider`,
 * `hash`, and the private `folderPath`. A denylist would leak any field added later, so new
 * fields stay invisible to MCP until they are added here on purpose.
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

export const getMediaOutputSchema = z.object({
  data: mediaAssetOutputSchema.nullable(),
});

export const listMediaOutputSchema = z.object({
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

export const listFoldersOutputSchema = z.object({
  data: z.array(mediaFolderNodeSchema).describe('Nested folder structure, roots first.'),
});

/**
 * `update_media` output — the updated asset in the same shape the read tools return,
 * so an agent can confirm the write without a follow-up `get_media` call.
 */
export const updateMediaOutputSchema = z.object({
  data: mediaAssetOutputSchema,
});

import type { MediaFolderNode } from '../schemas';

type RawFolder = {
  id?: unknown;
  name?: unknown;
  children?: unknown;
};

type RawAsset = Record<string, unknown> & {
  folder?: RawFolder | null;
};

/** Coerces a value to a string, or null when it is absent. Timestamps arrive as Date or string. */
const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Projects a raw file row onto the MCP asset shape.
 *
 * This is an allowlist: every exposed key is named explicitly, so `provider`,
 * `provider_metadata` (which can carry provider credentials), `hash`, `formats`, `related`,
 * and the private `folderPath` never reach an MCP client — including after new fields are
 * added to the file content-type.
 */
export const sanitizeMediaAsset = (asset: RawAsset) => {
  const folder = asset.folder;

  return {
    id: Number(asset.id),
    name: String(asset.name ?? ''),
    alternativeText: toNullableString(asset.alternativeText),
    caption: toNullableString(asset.caption),
    url: String(asset.url ?? ''),
    mime: String(asset.mime ?? ''),
    size: Number(asset.size ?? 0),
    width: toNullableNumber(asset.width),
    height: toNullableNumber(asset.height),
    ext: toNullableString(asset.ext),
    folder:
      folder !== null && folder !== undefined && folder.id !== undefined
        ? { id: Number(folder.id), name: String(folder.name ?? '') }
        : null,
    createdAt: toNullableString(asset.createdAt),
    updatedAt: toNullableString(asset.updatedAt),
  };
};

/**
 * Projects the recursive output of `folder.getStructure()` onto `{ id, name, children }`,
 * dropping `path` and `pathId` (internal materialized-path bookkeeping).
 */
export const sanitizeMediaFolderTree = (nodes: unknown): MediaFolderNode[] => {
  if (Array.isArray(nodes) === false) return [];

  return (nodes as RawFolder[]).map((node) => ({
    id: Number(node.id),
    name: String(node.name ?? ''),
    children: sanitizeMediaFolderTree(node.children),
  }));
};

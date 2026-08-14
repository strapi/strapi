import { getRelationId } from './getRelationId';

import type { File } from '../../../../shared/contracts/files';
import type { Folder } from '../../../../shared/contracts/folders';

/**
 * Where each loaded item actually lives, keyed by id.
 *
 * Search results are global, so the folder currently open (`?folder=`) says
 * nothing about a selected item's location. The loaded lists do: the server
 * populates `folder` on `/upload/files` and `parent` on `/upload/folders`.
 *
 * `undefined` means "not in the loaded list" and is distinct from `null`
 * ("lives at the root") — the two lead to different move validation.
 */
export interface ItemLocations {
  fileFolderId: (id: number) => number | null | undefined;
  folderParentId: (id: number) => number | null | undefined;
}

/** Every id misses — used where no list is loaded (e.g. an isolated provider). */
export const emptyItemLocations: ItemLocations = {
  fileFolderId: () => undefined,
  folderParentId: () => undefined,
};

/**
 * Build the lookup once per list. Callers memoize on the rows so the identity
 * stays stable: `BulkMoveDialog` memoizes its destination walk on the items
 * derived from it.
 */
export const buildItemLocations = (assets: File[], folders: Folder[]): ItemLocations => {
  const fileFolderIds = new Map<number, number | null>();
  const folderParentIds = new Map<number, number | null>();

  assets.forEach((asset) => {
    fileFolderIds.set(asset.id, getRelationId(asset.folder));
  });

  folders.forEach((folder) => {
    folderParentIds.set(folder.id, getRelationId(folder.parent));
  });

  return {
    fileFolderId: (id) => fileFolderIds.get(id),
    folderParentId: (id) => folderParentIds.get(id),
  };
};

/**
 * Resolve an item's location, falling back to the folder currently open when it
 * is not in the loaded list. The fallback is unreachable in practice — selection
 * clears whenever the list identity changes and infinite scroll only appends —
 * but a stale parent beats silently dropping the item from the move.
 */
export const locateItem = (
  locations: ItemLocations,
  kind: 'file' | 'folder',
  id: number,
  fallbackFolderId: number | null
): number | null => {
  const located = kind === 'file' ? locations.fileFolderId(id) : locations.folderParentId(id);

  return located === undefined ? fallbackFolderId : located;
};

/**
 * Fingerprint for "which asset list the user is looking at".
 *
 * Selection clears when this key changes (see ClearSelectionOnChange in AssetsPage).
 *
 * Hybrid rule
 * - Folder, search (term or scope), sort, filter changes → new key → selection clears.
 * - Switching table/grid view does NOT change the key — both views render the
 *   same list, so the selection survives the toggle.
 * - Infinite scroll (load more) does NOT change any segment → selection persists.
 */
export interface ListQueryKeyInput {
  folderId: number | null;
  search: string;
  /** "Search all media" widens a folder search to the whole library. */
  searchAll: boolean;
  /** Composite of asset sort and folder position — both change the render order. */
  sort: string | null;
  /** Serialized list filters (`?filters=`), or null when none are set. */
  filter: string | null;
}

/**
 * Builds a stable fingerprint for the current asset list query.
 *
 * Selection clears when this key changes. Infinite scroll does not change any
 * segment, so selection persists across load-more.
 */
export const getListQueryKey = ({
  folderId,
  search,
  searchAll,
  sort,
  filter,
}: ListQueryKeyInput): string => JSON.stringify({ folderId, search, searchAll, sort, filter });

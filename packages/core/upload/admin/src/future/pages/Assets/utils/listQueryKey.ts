/**
 * Fingerprint for "which asset list the user is looking at".
 *
 * Selection clears when this key changes (see ClearSelectionOnChange in AssetsPage).
 *
 * Hybrid rule
 * - Folder, search, sort, filter changes → new key → selection clears.
 * - Switching table/grid view does NOT change the key — both views render the
 *   same list, so the selection survives the toggle.
 * - Infinite scroll (load more) does NOT change any segment → selection persists.
 *
 * Search/filter use stable defaults until their header controls are wired;
 * follow-up PRs only pass real values — no selection logic changes needed.
 */
export interface ListQueryKeyInput {
  folderId: number | null;
  /** Empty string until search UI ships. */
  search: string;
  /** Null until sort UI ships. */
  sort: string | null;
  /** Null until filter UI ships. */
  filter: string | null;
}

/**
 * Builds a stable fingerprint for the current asset list query.
 *
 * Selection clears when this key changes. Infinite scroll does not change any
 * segment, so selection persists across load-more.
 */
export const getListQueryKey = ({ folderId, search, sort, filter }: ListQueryKeyInput): string =>
  JSON.stringify({ folderId, search, sort, filter });

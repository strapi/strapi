/**
 * Fingerprint for "which asset list the user is looking at".
 *
 * Selection clears when this key changes (see ClearSelectionOnChange in AssetsPage).
 *
 * Hybrid rule
 * - Folder, view, search, sort, filter changes → new key → selection clears.
 * - Infinite scroll (load more) does NOT change any segment → selection persists.
 *
 * Search/sort/filter use stable defaults until their header controls are wired;
 * follow-up PRs only pass real values — no selection logic changes needed.
 */
export interface ListQueryKeyInput {
  folderId: number | null;
  view: number;
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
export const getListQueryKey = ({
  folderId,
  view,
  search,
  sort,
  filter,
}: ListQueryKeyInput): string => JSON.stringify({ folderId, view, search, sort, filter });

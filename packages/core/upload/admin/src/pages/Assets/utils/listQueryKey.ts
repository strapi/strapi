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
 * Filter uses a stable default until its header control is wired; that follow-up
 * only passes a real value — no selection logic changes needed.
 */
export interface ListQueryKeyInput {
  folderId: number | null;
  search: string;
  /** Composite of asset sort and folder position — both change the render order. */
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

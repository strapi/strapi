/**
 * Pure, view-agnostic selection logic for the future Media Library multi-select.
 *
 * TODO
 * Selection is **assets-only** for now (folders are excluded from every
 * computation).
 */

export interface SelectionState {
  /** Currently selected asset ids. */
  selectedIds: Set<number>;
  /** Anchor used as the start of a Shift+click range. */
  anchorId: number | null;
}

export const createEmptySelection = (): SelectionState => ({
  selectedIds: new Set<number>(),
  anchorId: null,
});

/**
 * Additive toggle — adds the id if absent, removes it otherwise, without
 * touching the rest of the selection. Used by the row checkbox and Cmd/Ctrl+click.
 * The toggled id becomes the new anchor.
 */
export const toggleSelection = (state: SelectionState, id: number): SelectionState => {
  const selectedIds = new Set(state.selectedIds);

  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }

  return { selectedIds, anchorId: id };
};

/**
 * Plain click — selects only this id, dropping any prior selection. Sets the anchor.
 */
export const selectOnly = (_state: SelectionState, id: number): SelectionState => ({
  selectedIds: new Set<number>([id]),
  anchorId: id,
});

/**
 * Shift+click — selects the contiguous range between the current anchor and the
 * target in render order, replacing the current selection. The anchor stays put.
 *
 * Falls back to {@link selectOnly} when there is no usable anchor (e.g. first
 * click was a Shift+click, or the anchor is no longer in the list).
 */
export const selectRange = (
  state: SelectionState,
  orderedIds: number[],
  targetId: number
): SelectionState => {
  const targetIndex = orderedIds.indexOf(targetId);

  if (targetIndex === -1) {
    return state;
  }

  const anchorIndex = state.anchorId === null ? -1 : orderedIds.indexOf(state.anchorId);

  if (anchorIndex === -1) {
    return { selectedIds: new Set<number>([targetId]), anchorId: targetId };
  }

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);

  return {
    selectedIds: new Set(orderedIds.slice(start, end + 1)),
    anchorId: state.anchorId,
  };
};

/**
 * Select-all — selects every id in the provided ordered array. Used by the header
 * checkbox when not all assets are already selected.
 */
export const selectAll = (orderedIds: number[]): SelectionState => ({
  selectedIds: new Set(orderedIds),
  anchorId: orderedIds.length > 0 ? orderedIds[orderedIds.length - 1] : null,
});

export const clearSelection = (): SelectionState => createEmptySelection();

export interface SelectAllState {
  allSelected: boolean;
  isIndeterminate: boolean;
}

/**
 * Derives the header checkbox state: all assets selected, some (indeterminate),
 * or none. Only considers the currently-rendered assets (orderedIds).
 */
export const getSelectAllState = (
  selectedIds: Set<number>,
  orderedIds: number[]
): SelectAllState => {
  if (orderedIds.length === 0) {
    return { allSelected: false, isIndeterminate: false };
  }

  const selectedCount = orderedIds.reduce(
    (count, id) => (selectedIds.has(id) ? count + 1 : count),
    0
  );
  const allSelected = selectedCount === orderedIds.length;

  return {
    allSelected,
    isIndeterminate: selectedCount > 0 && !allSelected,
  };
};

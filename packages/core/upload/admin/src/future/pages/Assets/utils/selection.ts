/**
 * Pure, view-agnostic selection logic for the future Media Library multi-select.
 *
 * Selection covers both assets and folders. Since their numeric ids live in
 * different tables (and can collide), items are tracked as namespaced keys
 * (`asset:1` / `folder:1`). Views build their rendered order as a key array so
 * range / select-all work across the folder and asset sections seamlessly.
 */

export type SelectableKind = 'asset' | 'folder';

export type ItemKey = `${SelectableKind}:${number}`;

export const assetKey = (id: number): ItemKey => `asset:${id}`;

export const folderKey = (id: number): ItemKey => `folder:${id}`;

/** Extracts the numeric ids of one kind from a set of item keys. */
export const getIdsOfKind = (keys: Set<ItemKey>, kind: SelectableKind): Set<number> => {
  const ids = new Set<number>();

  keys.forEach((key) => {
    const [keyKind, id] = key.split(':');
    if (keyKind === kind) {
      ids.add(Number(id));
    }
  });

  return ids;
};

export interface SelectionState {
  /** Currently selected item keys (assets and folders). */
  selectedKeys: Set<ItemKey>;
  /** Anchor used as the start of a Shift+click range. */
  anchorKey: ItemKey | null;
}

export const createEmptySelection = (): SelectionState => ({
  selectedKeys: new Set<ItemKey>(),
  anchorKey: null,
});

/**
 * Additive toggle — adds the key if absent, removes it otherwise, without
 * touching the rest of the selection. Used by the item checkbox and Cmd/Ctrl+click.
 * The toggled key becomes the new anchor.
 */
export const toggleSelection = (state: SelectionState, key: ItemKey): SelectionState => {
  const selectedKeys = new Set(state.selectedKeys);

  if (selectedKeys.has(key)) {
    selectedKeys.delete(key);
  } else {
    selectedKeys.add(key);
  }

  return { selectedKeys, anchorKey: key };
};

/**
 * Plain click — selects only this key, dropping any prior selection. Sets the anchor.
 */
export const selectOnly = (_state: SelectionState, key: ItemKey): SelectionState => ({
  selectedKeys: new Set<ItemKey>([key]),
  anchorKey: key,
});

/**
 * Shift+click — selects the contiguous range between the current anchor and the
 * target in render order, replacing the current selection. The anchor stays put.
 *
 * Falls back to a single selection when there is no usable anchor (e.g. first
 * click was a Shift+click, or the anchor is no longer in the list).
 */
export const selectRange = (
  state: SelectionState,
  orderedKeys: ItemKey[],
  targetKey: ItemKey
): SelectionState => {
  const targetIndex = orderedKeys.indexOf(targetKey);

  if (targetIndex === -1) {
    return state;
  }

  const anchorIndex = state.anchorKey === null ? -1 : orderedKeys.indexOf(state.anchorKey);

  if (anchorIndex === -1) {
    return { selectedKeys: new Set<ItemKey>([targetKey]), anchorKey: targetKey };
  }

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);

  return {
    selectedKeys: new Set(orderedKeys.slice(start, end + 1)),
    anchorKey: state.anchorKey,
  };
};

/**
 * Select-all — selects every key in the provided ordered array. Used by the header
 * checkbox when not everything is already selected.
 */
export const selectAll = (orderedKeys: ItemKey[]): SelectionState => ({
  selectedKeys: new Set(orderedKeys),
  anchorKey: orderedKeys.length > 0 ? orderedKeys[orderedKeys.length - 1] : null,
});

export const clearSelection = (): SelectionState => createEmptySelection();

export interface SelectAllState {
  allSelected: boolean;
  isIndeterminate: boolean;
}

/**
 * Derives the header checkbox state: everything selected, some (indeterminate),
 * or none. Only considers the currently-rendered items (orderedKeys).
 */
export const getSelectAllState = (
  selectedKeys: Set<ItemKey>,
  orderedKeys: ItemKey[]
): SelectAllState => {
  if (orderedKeys.length === 0) {
    return { allSelected: false, isIndeterminate: false };
  }

  const selectedCount = orderedKeys.reduce(
    (count, key) => (selectedKeys.has(key) ? count + 1 : count),
    0
  );
  const allSelected = selectedCount === orderedKeys.length;

  return {
    allSelected,
    isIndeterminate: selectedCount > 0 && !allSelected,
  };
};

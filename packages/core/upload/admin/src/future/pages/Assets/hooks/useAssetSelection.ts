import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  clearSelection,
  createEmptySelection,
  getIdsOfKind,
  selectAll as selectAllState,
  selectOnly as selectOnlyState,
  selectRange as selectRangeState,
  toggleSelection,
  type ItemKey,
  type SelectionState,
} from '../utils/selection';

/**
 * Ephemeral, view-state-only multi-select for the future Media Library. Selection
 * is page-scoped and reset on folder navigation / view switch.
 *
 * The actual computation lives in `../utils/selection.ts` (pure + unit-tested);
 * this hook is a thin React wrapper. Assets and folders share one mechanism —
 * items are tracked as namespaced keys (`asset:1` / `folder:1`) so toggle, range
 * and select-all behave the same for both. Range / select-all receive the
 * ordered key array from the caller (the view owns the rendered order), keeping
 * the context data-source-agnostic.
 */
export interface AssetSelection {
  /** Every selected item key (assets and folders), render-order agnostic. */
  selectedKeys: Set<ItemKey>;
  /** Selected asset ids, derived from {@link selectedKeys}. */
  selectedIds: Set<number>;
  /** Selected folder ids, derived from {@link selectedKeys}. */
  selectedFolderIds: Set<number>;
  anchorKey: ItemKey | null;
  isSelected: (key: ItemKey) => boolean;
  /** Additive toggle (Cmd/Ctrl+click, item checkbox). */
  toggle: (key: ItemKey) => void;
  /** Plain click — replaces the selection with a single item. */
  selectOnly: (key: ItemKey) => void;
  /** Shift+click — selects the contiguous range from the anchor to the target. */
  selectRange: (orderedKeys: ItemKey[], targetKey: ItemKey) => void;
  /** Header checkbox — selects every rendered item (folders and assets). */
  selectAll: (orderedKeys: ItemKey[]) => void;
  /** Close button / folder navigation / view switch. */
  clear: () => void;
}

const AssetSelectionContext = createContext<AssetSelection | null>(null);

interface AssetSelectionProviderProps {
  children: ReactNode;
}

export const AssetSelectionProvider = ({ children }: AssetSelectionProviderProps) => {
  const [state, setState] = useState<SelectionState>(createEmptySelection);

  const isSelected = useCallback(
    (key: ItemKey) => state.selectedKeys.has(key),
    [state.selectedKeys]
  );

  const toggle = useCallback((key: ItemKey) => setState((prev) => toggleSelection(prev, key)), []);

  const selectOnly = useCallback(
    (key: ItemKey) => setState((prev) => selectOnlyState(prev, key)),
    []
  );

  const selectRange = useCallback(
    (orderedKeys: ItemKey[], targetKey: ItemKey) =>
      setState((prev) => selectRangeState(prev, orderedKeys, targetKey)),
    []
  );

  const selectAll = useCallback(
    (orderedKeys: ItemKey[]) => setState(selectAllState(orderedKeys)),
    []
  );

  const clear = useCallback(() => setState(clearSelection()), []);

  const selectedIds = useMemo(
    () => getIdsOfKind(state.selectedKeys, 'asset'),
    [state.selectedKeys]
  );
  const selectedFolderIds = useMemo(
    () => getIdsOfKind(state.selectedKeys, 'folder'),
    [state.selectedKeys]
  );

  const value = useMemo<AssetSelection>(
    () => ({
      selectedKeys: state.selectedKeys,
      selectedIds,
      selectedFolderIds,
      anchorKey: state.anchorKey,
      isSelected,
      toggle,
      selectOnly,
      selectRange,
      selectAll,
      clear,
    }),
    [
      state.selectedKeys,
      selectedIds,
      selectedFolderIds,
      state.anchorKey,
      isSelected,
      toggle,
      selectOnly,
      selectRange,
      selectAll,
      clear,
    ]
  );

  return createElement(AssetSelectionContext.Provider, { value }, children);
};

export const useAssetSelection = () => {
  const context = useContext(AssetSelectionContext);

  if (!context) {
    throw new Error('useAssetSelection must be used within an AssetSelectionProvider');
  }

  return context;
};

export const useAssetSelectionOptional = () => useContext(AssetSelectionContext);

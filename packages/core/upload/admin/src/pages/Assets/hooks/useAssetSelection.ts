import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import {
  clearSelection,
  createEmptySelection,
  deselect as deselectState,
  getIdsOfKind,
  selectAll as selectAllState,
  selectRange as selectRangeState,
  toggleSelection,
  type ItemKey,
  type SelectionState,
} from '../utils/selection';

/**
 * Ephemeral, view-state-only multi-select for the future Media Library. Selection
 * is page-scoped and reset on folder navigation or sort/filter changes (the
 * table/grid toggle keeps it — same list, different presentation).
 *
 * The actual computation lives in `../utils/selection.ts` (pure + unit-tested);
 * this hook is a thin React wrapper. Assets and folders share one mechanism —
 * items are tracked as namespaced keys (`asset:1` / `folder:1`) so toggle, range
 * and select-all behave the same for both. Range / select-all receive the
 * ordered key array from the caller (the view owns the rendered order), keeping
 * the context data-source-agnostic.
 */
/**
 * How an item takes part in selection: `enabled` shows a working checkbox,
 * `disabled` shows it greyed out (the item cannot be chosen here), `hidden`
 * shows none (the item is not something this selection is about).
 */
export type Selectability = 'enabled' | 'disabled' | 'hidden';

export interface AssetSelection {
  /**
   * Whether selection is on at all. Views show the checkbox column and
   * select-all only when it is.
   */
  isEnabled: boolean;
  /** Whether the table offers a select-all header (not on a single-value picker). */
  canSelectAll: boolean;
  getSelectability: (key: ItemKey) => Selectability;
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
  /** Shift+click — selects the contiguous range from the anchor to the target. */
  selectRange: (orderedKeys: ItemKey[], targetKey: ItemKey) => void;
  /** Header checkbox — selects every rendered item (folders and assets). */
  selectAll: (orderedKeys: ItemKey[]) => void;
  /**
   * Replaces the selection with this one key, as a right-click on an unselected
   * item does: what the menu then acts on is what the user can see is selected.
   */
  selectOnly: (key: ItemKey) => void;
  /** Row-level "..." menu — drops one key when its item leaves the list (move, delete). */
  deselect: (key: ItemKey) => void;
  /**
   * Header checkbox, when everything it covers is selected. The host decides how
   * far that reaches: the Media Library page clears the whole selection, because
   * it can still hold keys that left the list without being deselected (moved or
   * deleted from the details drawer). The picker drops only these keys.
   */
  deselectAll: (orderedKeys: ItemKey[]) => void;
  /** Close button / folder navigation / list-identity changes. */
  clear: () => void;
}

/**
 * Exported so a host with its own selection rules (the Content Manager asset
 * picker) can feed the same views a different implementation.
 */
export const AssetSelectionContext = createContext<AssetSelection | null>(null);

interface AssetSelectionProviderProps {
  children: ReactNode;
  /**
   * When true, selection is inert: every mutator is a no-op and nothing ever
   * reads as selected. Every bulk action is gated on `assets.update`, so a user
   * without it has nothing to select for — the views also hide the checkboxes,
   * and this makes the remaining paths (click-to-select, Space key) do nothing.
   */
  disabled?: boolean;
}

export const AssetSelectionProvider = ({
  children,
  disabled = false,
}: AssetSelectionProviderProps) => {
  const [state, setState] = useState<SelectionState>(createEmptySelection);
  // Every bulk action needs `assets.update`: without it the views show no
  // checkboxes, whatever the host passes as `disabled`.
  const { canUpdate } = useMediaLibraryPermissions();
  const isEnabled = !disabled && canUpdate;

  const isSelected = useCallback(
    (key: ItemKey) => !disabled && state.selectedKeys.has(key),
    [disabled, state.selectedKeys]
  );

  const toggle = useCallback(
    (key: ItemKey) => {
      if (disabled) return;
      setState((prev) => toggleSelection(prev, key));
    },
    [disabled]
  );

  const selectRange = useCallback(
    (orderedKeys: ItemKey[], targetKey: ItemKey) => {
      if (disabled) return;
      setState((prev) => selectRangeState(prev, orderedKeys, targetKey));
    },
    [disabled]
  );

  const selectAll = useCallback(
    (orderedKeys: ItemKey[]) => {
      if (disabled) return;
      setState(selectAllState(orderedKeys));
    },
    [disabled]
  );

  const selectOnly = useCallback(
    (key: ItemKey) => {
      if (disabled) return;
      setState(selectAllState([key]));
    },
    [disabled]
  );

  // No `disabled` guard, like `clear`: this only ever shrinks the selection, and a
  // disabled provider has nothing in it (every additive path is guarded).
  const deselect = useCallback((key: ItemKey) => setState((prev) => deselectState(prev, key)), []);

  const clear = useCallback(() => setState(clearSelection()), []);

  const selectedIds = useMemo(
    () => getIdsOfKind(state.selectedKeys, 'asset'),
    [state.selectedKeys]
  );
  const selectedFolderIds = useMemo(
    () => getIdsOfKind(state.selectedKeys, 'folder'),
    [state.selectedKeys]
  );

  const getSelectability = useCallback(
    (): Selectability => (isEnabled ? 'enabled' : 'hidden'),
    [isEnabled]
  );

  const value = useMemo<AssetSelection>(
    () => ({
      isEnabled,
      canSelectAll: true,
      getSelectability,
      selectedKeys: state.selectedKeys,
      selectedIds,
      selectedFolderIds,
      anchorKey: state.anchorKey,
      isSelected,
      toggle,
      selectRange,
      selectAll,
      selectOnly,
      deselect,
      deselectAll: clear,
      clear,
    }),
    [
      isEnabled,
      getSelectability,
      state.selectedKeys,
      selectedIds,
      selectedFolderIds,
      state.anchorKey,
      isSelected,
      toggle,
      selectRange,
      selectAll,
      selectOnly,
      deselect,
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

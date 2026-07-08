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
  selectAll as selectAllState,
  selectOnly as selectOnlyState,
  selectRange as selectRangeState,
  toggleSelection,
  type SelectionState,
} from '../utils/selection';

/**
 * Ephemeral, view-state-only multi-select for the future Media Library. Selection
 * is page-scoped and reset on folder navigation / view switch.
 *
 * The actual computation lives in `../utils/selection.ts` (pure + unit-tested);
 * this hook is a thin React wrapper. Range / select-all receive the ordered id
 * array from the caller (AssetsTable owns the rendered `assets` order), keeping
 * the context data-source-agnostic.
 */
export interface AssetSelection {
  /** Selected asset ids. */
  selectedIds: Set<number>;
  /**
   * Selected folder ids. Folders are selectable only via their checkbox
   * (plain toggle) — click/range/select-all semantics stay asset-only, so the
   * pure selection state machine in `utils/selection.ts` is untouched.
   */
  selectedFolderIds: Set<number>;
  anchorId: number | null;
  isSelected: (id: number) => boolean;
  isFolderSelected: (id: number) => boolean;
  /** Additive toggle (Cmd/Ctrl+click, row checkbox). */
  toggle: (id: number) => void;
  /** Additive toggle for a folder (checkbox only). */
  toggleFolder: (id: number) => void;
  /** Plain click — replaces the selection with a single id. */
  selectOnly: (id: number) => void;
  /** Shift+click — selects the contiguous range from the anchor to the target. */
  selectRange: (orderedIds: number[], targetId: number) => void;
  /** Header checkbox — selects every rendered asset. */
  selectAll: (orderedIds: number[]) => void;
  /** Close button / folder navigation / view switch. */
  clear: () => void;
}

const AssetSelectionContext = createContext<AssetSelection | null>(null);

interface AssetSelectionProviderProps {
  children: ReactNode;
}

export const AssetSelectionProvider = ({ children }: AssetSelectionProviderProps) => {
  const [state, setState] = useState<SelectionState>(createEmptySelection);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<number>>(() => new Set());

  const isSelected = useCallback((id: number) => state.selectedIds.has(id), [state.selectedIds]);

  const isFolderSelected = useCallback(
    (id: number) => selectedFolderIds.has(id),
    [selectedFolderIds]
  );

  const toggle = useCallback((id: number) => setState((prev) => toggleSelection(prev, id)), []);

  const toggleFolder = useCallback(
    (id: number) =>
      setSelectedFolderIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      }),
    []
  );

  const selectOnly = useCallback((id: number) => setState((prev) => selectOnlyState(prev, id)), []);

  const selectRange = useCallback(
    (orderedIds: number[], targetId: number) =>
      setState((prev) => selectRangeState(prev, orderedIds, targetId)),
    []
  );

  const selectAll = useCallback((orderedIds: number[]) => setState(selectAllState(orderedIds)), []);

  const clear = useCallback(() => {
    setState(clearSelection());
    setSelectedFolderIds(new Set());
  }, []);

  const value = useMemo<AssetSelection>(
    () => ({
      selectedIds: state.selectedIds,
      selectedFolderIds,
      anchorId: state.anchorId,
      isSelected,
      isFolderSelected,
      toggle,
      toggleFolder,
      selectOnly,
      selectRange,
      selectAll,
      clear,
    }),
    [
      state.selectedIds,
      selectedFolderIds,
      state.anchorId,
      isSelected,
      isFolderSelected,
      toggle,
      toggleFolder,
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

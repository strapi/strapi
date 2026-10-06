import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  AssetSelectionContext,
  type AssetSelection,
  type Selectability,
} from '../../pages/Assets/hooks/useAssetSelection';
import { assetKey, type ItemKey } from '../../pages/Assets/utils/selection';
import { isAllowedAssetType, type MediaAllowedTypes } from '../../utils/isAllowedAssetType';

import { hasFile, removeFile, toggleFile, type PickerSelection } from './pickerSelection';

import type { File } from '../../../../shared/contracts/files';

interface PickerSelectionContextValue {
  selection: PickerSelection;
}

const PickerSelectionContext = createContext<PickerSelectionContextValue | null>(null);

export const usePickerSelection = () => {
  const context = useContext(PickerSelectionContext);

  if (!context) {
    throw new Error('usePickerSelection must be used within a PickerSelectionProvider');
  }

  return context;
};

const parseAssetId = (key: ItemKey): number | null => {
  const [kind, id] = key.split(':');

  return kind === 'asset' ? Number(id) : null;
};

const NO_FOLDERS = new Set<number>();

interface PickerSelectionProviderProps {
  children: ReactNode;
  initialSelection: File[];
  multiple: boolean;
  allowedTypes?: MediaAllowedTypes | null;
  /**
   * The assets on screen. Views select by key, but the selection keeps whole
   * files, so a newly picked key is resolved against these.
   */
  knownFiles: File[];
}

/**
 * The Content Manager picker's selection, behind the same `AssetSelection`
 * interface the Media Library views read: only assets are selectable, assets
 * outside `allowedTypes` are shown but cannot be picked, and the selection
 * survives folder changes, search, filters and sort.
 */
export const PickerSelectionProvider = ({
  children,
  initialSelection,
  multiple,
  allowedTypes,
  knownFiles,
}: PickerSelectionProviderProps) => {
  const [selection, setSelection] = useState<PickerSelection>(initialSelection);

  const filesById = useMemo(() => {
    const map = new Map<number, File>();
    [...knownFiles, ...selection].forEach((file) => map.set(file.id, file));
    return map;
  }, [knownFiles, selection]);

  const resolveSelectableFile = useCallback(
    (key: ItemKey): File | null => {
      const id = parseAssetId(key);
      const file = id === null ? undefined : filesById.get(id);

      return file && isAllowedAssetType(allowedTypes, file.mime) ? file : null;
    },
    [allowedTypes, filesById]
  );

  const getSelectability = useCallback(
    (key: ItemKey): Selectability => {
      const id = parseAssetId(key);

      if (id === null) {
        return 'hidden';
      }

      const file = filesById.get(id);

      return file && !isAllowedAssetType(allowedTypes, file.mime) ? 'disabled' : 'enabled';
    },
    [allowedTypes, filesById]
  );

  const toggle = useCallback(
    (key: ItemKey) => {
      const file = resolveSelectableFile(key);

      if (file) {
        setSelection((prev) => toggleFile(prev, file, { multiple }));
      }
    },
    [multiple, resolveSelectableFile]
  );

  const selectOnly = useCallback(
    (key: ItemKey) => {
      const file = resolveSelectableFile(key);

      if (file) {
        setSelection([file]);
      }
    },
    [resolveSelectableFile]
  );

  const deselect = useCallback((key: ItemKey) => {
    const id = parseAssetId(key);

    if (id !== null) {
      setSelection((prev) => removeFile(prev, id));
    }
  }, []);

  const clear = useCallback(() => setSelection([]), []);

  const selectedKeys = useMemo(
    () => new Set(selection.map((file) => assetKey(file.id))),
    [selection]
  );
  const selectedIds = useMemo(() => new Set(selection.map((file) => file.id)), [selection]);

  const isSelected = useCallback(
    (key: ItemKey) => {
      const id = parseAssetId(key);

      return id !== null && hasFile(selection, id);
    },
    [selection]
  );

  const assetSelection = useMemo<AssetSelection>(
    () => ({
      isEnabled: true,
      // Picking is deliberate, one asset at a time: no select-all header.
      canSelectAll: false,
      getSelectability,
      selectedKeys,
      selectedIds,
      selectedFolderIds: NO_FOLDERS,
      anchorKey: null,
      isSelected,
      toggle,
      // Picking is one asset at a time; a Shift+click range picks the target.
      selectRange: (_orderedKeys, targetKey) => toggle(targetKey),
      // Unreachable: `canSelectAll` hides the only control that calls it.
      selectAll: () => {},
      selectOnly,
      deselect,
      clear,
    }),
    [getSelectability, selectedKeys, selectedIds, isSelected, toggle, selectOnly, deselect, clear]
  );

  const pickerSelection = useMemo(() => ({ selection }), [selection]);

  return (
    <PickerSelectionContext.Provider value={pickerSelection}>
      <AssetSelectionContext.Provider value={assetSelection}>
        {children}
      </AssetSelectionContext.Provider>
    </PickerSelectionContext.Provider>
  );
};

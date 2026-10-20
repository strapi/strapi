import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  AssetSelectionContext,
  type AssetSelection,
  type Selectability,
} from '../../pages/Assets/hooks/useAssetSelection';
import { assetKey, type ItemKey } from '../../pages/Assets/utils/selection';
import { isAllowedAssetType, type MediaAllowedTypes } from '../../utils/isAllowedAssetType';

import {
  addFiles,
  hasFile,
  moveFile,
  removeFile,
  removeFiles,
  toggleFile,
  type PickerSelection,
} from './pickerSelection';

import type { File } from '../../../../shared/contracts/files';

interface PickerSelectionContextValue {
  selection: PickerSelection;
  moveFile: (activeId: number, overId: number) => void;
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

  const selectedIds = useMemo(() => new Set(selection.map((file) => file.id)), [selection]);

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

      // `allowedTypes` only stops adding an asset. One the field already holds,
      // for example from before the schema was narrowed, must stay removable.
      if (selectedIds.has(id)) {
        return 'enabled';
      }

      const file = filesById.get(id);

      return file && !isAllowedAssetType(allowedTypes, file.mime) ? 'disabled' : 'enabled';
    },
    [allowedTypes, filesById, selectedIds]
  );

  const toggle = useCallback(
    (key: ItemKey) => {
      const id = parseAssetId(key);

      if (id !== null && selectedIds.has(id)) {
        setSelection((prev) => removeFile(prev, id));
        return;
      }

      const file = resolveSelectableFile(key);

      if (file) {
        setSelection((prev) => toggleFile(prev, file, { multiple }));
      }
    },
    [multiple, resolveSelectableFile, selectedIds]
  );

  // Select-all over the assets on screen that can be picked, appended in their
  // on-screen order. Only a multiple-value field offers it.
  const selectAll = useCallback(
    (orderedKeys: ItemKey[]) => {
      if (!multiple) {
        return;
      }

      const files = orderedKeys
        .map((key) => resolveSelectableFile(key))
        .filter((file): file is File => file !== null);

      setSelection((prev) => addFiles(prev, files));
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

  const deselectAll = useCallback((orderedKeys: ItemKey[]) => {
    const ids = new Set(
      orderedKeys.map((key) => parseAssetId(key)).filter((id): id is number => id !== null)
    );

    setSelection((prev) => removeFiles(prev, ids));
  }, []);

  const clear = useCallback(() => setSelection([]), []);

  const selectedKeys = useMemo(
    () => new Set(selection.map((file) => assetKey(file.id))),
    [selection]
  );

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
      // A single-value field holds one asset: nothing to select all of.
      canSelectAll: multiple,
      getSelectability,
      selectedKeys,
      selectedIds,
      selectedFolderIds: NO_FOLDERS,
      anchorKey: null,
      isSelected,
      toggle,
      // Picking is one asset at a time; a Shift+click range picks the target.
      selectRange: (_orderedKeys, targetKey) => toggle(targetKey),
      selectAll,
      selectOnly,
      deselect,
      deselectAll,
      clear,
    }),
    [
      multiple,
      getSelectability,
      selectedKeys,
      selectedIds,
      isSelected,
      toggle,
      selectAll,
      selectOnly,
      deselect,
      deselectAll,
      clear,
    ]
  );

  const moveSelectedFile = useCallback(
    (activeId: number, overId: number) => setSelection((prev) => moveFile(prev, activeId, overId)),
    []
  );

  const pickerSelection = useMemo(
    () => ({ selection, moveFile: moveSelectedFile }),
    [selection, moveSelectedFile]
  );

  return (
    <PickerSelectionContext.Provider value={pickerSelection}>
      <AssetSelectionContext.Provider value={assetSelection}>
        {children}
      </AssetSelectionContext.Provider>
    </PickerSelectionContext.Provider>
  );
};

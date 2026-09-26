import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { useAssetSelection } from '../hooks/useAssetSelection';

import { AssetContextMenu } from './AssetContextMenu';
import { FolderContextMenu } from './FolderContextMenu';
import { SelectionContextMenu } from './SelectionContextMenu';

import type { CursorPosition } from './CursorAnchoredMenu';
import type { File } from '../../../../../shared/contracts/files';
import type { Folder } from '../../../../../shared/contracts/folders';
import type { DragFileData, DragFolderData } from '../../../types/dnd';
import type { ItemLocations } from '../../../utils/itemLocations';
import type { ItemKey } from '../utils/selection';

/**
 * What a card or row hands over when it is right-clicked. It passes its own
 * asset rather than a key alone, so nothing here has to resolve keys back to
 * items — the item is already in scope where the gesture happens.
 */
export type ContextMenuPayload =
  | { kind: 'asset'; asset: File; dragData: DragFileData }
  | { kind: 'folder'; folder: Folder; dragData: DragFolderData };

type OpenForItem = (event: React.MouseEvent, key: ItemKey, payload: ContextMenuPayload) => void;

const ItemContextMenuContext = createContext<OpenForItem | null>(null);

/**
 * Called by the list items. Returns `null` outside the provider — the asset
 * picker renders the same cards without a context menu, and a missing provider
 * there should be a no-op rather than a crash.
 */
export const useItemContextMenuTrigger = (): OpenForItem | null =>
  useContext(ItemContextMenuContext);

interface OpenState {
  /**
   * Distinguishes one opening from the next.
   *
   * A right-click while a menu is open is two events: `pointerdown`, which
   * Radix treats as "dismiss", then `contextmenu`, which opens the next menu.
   * The dismissed menu's own effect runs *after* the new one has mounted, so a
   * plain `close()` would clear state that no longer belongs to it — and the
   * second right-click would appear to do nothing.
   */
  id: number;
  position: CursorPosition;
  payload: ContextMenuPayload | null;
}

interface ItemContextMenuProviderProps {
  /**
   * Real location of every loaded row, so a selection move validates each item
   * against its own parent — same input the bulk bar takes.
   */
  locations: ItemLocations;
  children: ReactNode;
}

/**
 * Owns the right-click menu for the list, above both the grid and the table so
 * one instance serves either view and the selection case has the `locations` it
 * needs.
 *
 * The rule, in one place:
 *
 * - right-clicking an item **inside a multi-selection** opens the selection
 *   menu, acting on all of it — the file-manager behaviour, and the menu leads
 *   with the count so what it acts on is stated before the actions are
 * - **anything else** replaces the selection with the clicked item and opens
 *   that item's own menu. That includes right-clicking an unselected item while
 *   others are selected: every file manager drops the old selection there, and
 *   the visible deselection is what stops the menu looking like it applies to
 *   items it doesn't
 */
export const ItemContextMenuProvider = ({ locations, children }: ItemContextMenuProviderProps) => {
  const { isSelected, selectOnly, selectedKeys } = useAssetSelection();
  // Resolved here, once, and handed to each menu as it opens. Mounted with the
  // list, so by the time anyone right-clicks the answer is in — a menu that
  // asked for itself would render empty for a tick.
  const permissions = useMediaLibraryPermissions();
  const [state, setState] = useState<OpenState | null>(null);
  const nextId = useRef(0);

  const openForItem = useCallback<OpenForItem>(
    (event, key, payload) => {
      // Only once we know we're handling it — declining would otherwise cost the
      // browser's own menu too.
      event.preventDefault();

      const position = { x: event.clientX, y: event.clientY };
      nextId.current += 1;
      const id = nextId.current;

      if (isSelected(key) && selectedKeys.size > 1) {
        setState({ id, position, payload: null });
        return;
      }

      // Replace the selection *before* the menu renders, so the highlight has
      // already moved by the time the user reads the menu.
      selectOnly(key);
      setState({ id, position, payload });
    },
    [isSelected, selectOnly, selectedKeys]
  );

  // Only the menu that is still on screen may close it.
  const close = useCallback(
    (id: number) => setState((prev) => (prev?.id === id ? null : prev)),
    []
  );

  const value = useMemo(() => openForItem, [openForItem]);

  return (
    <ItemContextMenuContext.Provider value={value}>
      {children}
      {state !== null &&
        (state.payload === null ? (
          <SelectionContextMenu
            key={state.id}
            position={state.position}
            locations={locations}
            onClose={() => close(state.id)}
          />
        ) : state.payload.kind === 'asset' ? (
          <AssetContextMenu
            // A fresh menu per gesture: the actions carry dialog state, and
            // reusing the instance across two right-clicks would carry it over.
            // Keyed on the opening rather than the item, so right-clicking the
            // same card twice still remounts.
            key={state.id}
            asset={state.payload.asset}
            dragData={state.payload.dragData}
            permissions={permissions}
            position={state.position}
            onClose={() => close(state.id)}
          />
        ) : (
          <FolderContextMenu
            key={state.id}
            folder={state.payload.folder}
            dragData={state.payload.dragData}
            position={state.position}
            onClose={() => close(state.id)}
          />
        ))}
    </ItemContextMenuContext.Provider>
  );
};

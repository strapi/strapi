import { useEffect, useState, type ReactNode } from 'react';

import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../utils/translations';

import { CursorAnchoredMenu, type CursorPosition } from './CursorAnchoredMenu';
import { SelectionActions } from './SelectionActions';

import type { ItemLocations } from '../../../utils/itemLocations';

interface SelectionContextMenuProps {
  position: CursorPosition;
  returnFocusTo: HTMLElement | null;
  /**
   * Real location of every loaded row, so the move dialog validates each
   * selected item against its own parent — same input the bulk bar takes.
   */
  locations: ItemLocations;
  onClose: () => void;
}

/**
 * Right-clicking one of several selected items acts on the selection, the way a
 * file manager does.
 *
 * The count leads, so what the menu is about to act on is stated before the
 * actions are. Right-clicking an item that is *not* in the selection replaces
 * the selection with it first, and `AssetContextMenu` handles it instead.
 *
 * Right-clicking the background with a selection live is a different menu:
 * `MainAreaContextMenu` shows these same actions above its creation ones.
 */
export const SelectionContextMenu = ({
  position,
  returnFocusTo,
  locations,
  onClose,
}: SelectionContextMenuProps) => {
  const { formatMessage } = useIntl();

  return (
    <SelectionActions locations={locations}>
      {({ hasActions, items, dialogs, isBusy }) => (
        <SelectionContextMenuBody
          hasActions={hasActions}
          isBusy={isBusy}
          position={position}
          returnFocusTo={returnFocusTo}
          label={formatMessage({
            id: getTranslationKey('list.selection.context-menu.label'),
            defaultMessage: 'Selection actions',
          })}
          items={items}
          dialogs={dialogs}
          onClose={onClose}
        />
      )}
    </SelectionActions>
  );
};

interface SelectionContextMenuBodyProps {
  hasActions: boolean;
  isBusy: boolean;
  position: CursorPosition;
  returnFocusTo: HTMLElement | null;
  label: string;
  items: ReactNode;
  dialogs: ReactNode;
  onClose: () => void;
}

/**
 * Split out because the "nothing left on screen" effects can't run inside the
 * render prop above — hooks don't belong in a callback.
 */
const SelectionContextMenuBody = ({
  hasActions,
  isBusy,
  position,
  returnFocusTo,
  label,
  items,
  dialogs,
  onClose,
}: SelectionContextMenuBodyProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  // Nothing left on screen — the menu is shut and no dialog took its place.
  useEffect(() => {
    if (!isMenuOpen && !isBusy) {
      onClose();
    }
  }, [isMenuOpen, isBusy, onClose]);

  // A role that can read but not update has nothing to offer for a selection.
  useEffect(() => {
    if (!hasActions) {
      onClose();
    }
  }, [hasActions, onClose]);

  if (!hasActions) {
    return null;
  }

  return (
    <>
      <CursorAnchoredMenu
        position={position}
        open={isMenuOpen}
        label={label}
        returnFocusTo={returnFocusTo}
        onClose={() => setIsMenuOpen(false)}
      >
        {items}
      </CursorAnchoredMenu>
      {dialogs}
    </>
  );
};

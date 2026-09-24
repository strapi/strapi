import { useEffect, useState } from 'react';

import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../utils/translations';

import { AssetActions } from './AssetActions';
import { CursorAnchoredMenu, type CursorPosition } from './CursorAnchoredMenu';

import type { File } from '../../../../../shared/contracts/files';
import type { DragFileData } from '../../../types/dnd';

interface AssetContextMenuProps {
  asset: File;
  dragData: DragFileData;
  position: CursorPosition;
  /** Mounted only while it has something on screen, so the parent drops it on this. */
  onClose: () => void;
}

/**
 * The right-click twin of `AssetActionsMenu`: same actions, opened at the
 * cursor instead of from the row's `•••`. Both render what `AssetActions`
 * gives them, so the two can't offer different things.
 *
 * Picking "Replace", "Move" or "Delete" closes the menu and opens a dialog in
 * the same tick, and that dialog is rendered here — so the menu being shut and
 * this being unmounted are two different things, tracked apart. Closing the
 * menu while a dialog is open would take the dialog with it.
 */
export const AssetContextMenu = ({ asset, dragData, position, onClose }: AssetContextMenuProps) => {
  const { formatMessage } = useIntl();
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  return (
    <AssetActions asset={asset} dragData={dragData}>
      {({ items, dialogs, hasActions, isDialogOpen }) => (
        <AssetContextMenuBody
          hasActions={hasActions}
          isDialogOpen={isDialogOpen}
          isMenuOpen={isMenuOpen}
          onMenuClose={() => setIsMenuOpen(false)}
          onClose={onClose}
          position={position}
          label={formatMessage({
            id: getTranslationKey('list.assets.context-menu.label'),
            defaultMessage: 'Asset actions',
          })}
          items={items}
          dialogs={dialogs}
        />
      )}
    </AssetActions>
  );
};

interface AssetContextMenuBodyProps {
  hasActions: boolean;
  isDialogOpen: boolean;
  isMenuOpen: boolean;
  onMenuClose: () => void;
  onClose: () => void;
  position: CursorPosition;
  label: string;
  items: React.ReactNode;
  dialogs: React.ReactNode;
}

/**
 * Split out because the "nothing left on screen" effect can't run inside the
 * render prop above — hooks don't belong in a callback.
 */
const AssetContextMenuBody = ({
  hasActions,
  isDialogOpen,
  isMenuOpen,
  onMenuClose,
  onClose,
  position,
  label,
  items,
  dialogs,
}: AssetContextMenuBodyProps) => {
  useEffect(() => {
    // The menu is shut and no dialog took its place — or the role has no
    // permitted action, so there was never a menu to begin with.
    if (!hasActions || (!isMenuOpen && !isDialogOpen)) {
      onClose();
    }
  }, [hasActions, isMenuOpen, isDialogOpen, onClose]);

  if (!hasActions) {
    return null;
  }

  return (
    <>
      <CursorAnchoredMenu position={position} open={isMenuOpen} label={label} onClose={onMenuClose}>
        {items}
      </CursorAnchoredMenu>
      {dialogs}
    </>
  );
};

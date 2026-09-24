import { useEffect, useState } from 'react';

import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../utils/translations';

import { AssetActions, type AssetActionPermissions } from './AssetActions';
import { CursorAnchoredMenu, type CursorPosition } from './CursorAnchoredMenu';

import type { File } from '../../../../../shared/contracts/files';
import type { DragFileData } from '../../../types/dnd';

interface AssetContextMenuProps {
  asset: File;
  dragData: DragFileData;
  /** Resolved by the provider, so this menu never renders while RBAC loads. */
  permissions: AssetActionPermissions;
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
 * this being unmounted are two different things, tracked apart. Unmounting
 * early would take the dialog with it, and for "Replace" the hidden file input
 * too, which is why `isBusy` also covers the native picker.
 */
export const AssetContextMenu = ({
  asset,
  dragData,
  permissions,
  position,
  onClose,
}: AssetContextMenuProps) => {
  const { formatMessage } = useIntl();
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  return (
    <AssetActions asset={asset} dragData={dragData} permissions={permissions}>
      {({ items, dialogs, hasActions, isBusy }) => (
        <AssetContextMenuBody
          hasActions={hasActions}
          isBusy={isBusy}
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
  isBusy: boolean;
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
  isBusy,
  isMenuOpen,
  onMenuClose,
  onClose,
  position,
  label,
  items,
  dialogs,
}: AssetContextMenuBodyProps) => {
  useEffect(() => {
    // The menu is shut and nothing took its place — no dialog, no file picker
    // — or the role has no permitted action, so there was never a menu at all.
    if (!hasActions || (!isMenuOpen && !isBusy)) {
      onClose();
    }
  }, [hasActions, isMenuOpen, isBusy, onClose]);

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

import { useEffect, useState, type ReactNode } from 'react';

import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../utils/translations';

import { CursorAnchoredMenu, type CursorPosition } from './CursorAnchoredMenu';
import { FolderActions } from './FolderActions';

import type { Folder } from '../../../../../shared/contracts/folders';
import type { DragFolderData } from '../../../types/dnd';

interface FolderContextMenuProps {
  folder: Pick<Folder, 'id' | 'name'>;
  dragData: DragFolderData;
  /** Passed through — the folder tree offers the menu without Rename. */
  showRename?: boolean;
  position: CursorPosition;
  /** Mounted only while it has something on screen, so the parent drops it on this. */
  onClose: () => void;
}

/**
 * The right-click twin of `FolderActionsMenu`: same actions, opened at the
 * cursor. Mirrors `AssetContextMenu`, including keeping "the menu is shut" and
 * "this is unmounted" as separate things — a dialog opened from an item is
 * rendered here and would go with an early unmount.
 */
export const FolderContextMenu = ({
  folder,
  dragData,
  showRename,
  position,
  onClose,
}: FolderContextMenuProps) => {
  const { formatMessage } = useIntl();
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  return (
    <FolderActions folder={folder} dragData={dragData} showRename={showRename}>
      {({ items, dialogs, isBusy }) => (
        <FolderContextMenuBody
          isBusy={isBusy}
          isMenuOpen={isMenuOpen}
          onMenuClose={() => setIsMenuOpen(false)}
          onClose={onClose}
          position={position}
          label={formatMessage({
            id: getTranslationKey('list.folder.context-menu.label'),
            defaultMessage: 'Folder actions',
          })}
          items={items}
          dialogs={dialogs}
        />
      )}
    </FolderActions>
  );
};

interface FolderContextMenuBodyProps {
  isBusy: boolean;
  isMenuOpen: boolean;
  onMenuClose: () => void;
  onClose: () => void;
  position: CursorPosition;
  label: string;
  items: ReactNode;
  dialogs: ReactNode;
}

/**
 * Split out because the "nothing left on screen" effect can't run inside the
 * render prop above — hooks don't belong in a callback.
 */
const FolderContextMenuBody = ({
  isBusy,
  isMenuOpen,
  onMenuClose,
  onClose,
  position,
  label,
  items,
  dialogs,
}: FolderContextMenuBodyProps) => {
  useEffect(() => {
    if (!isMenuOpen && !isBusy) {
      onClose();
    }
  }, [isMenuOpen, isBusy, onClose]);

  return (
    <>
      <CursorAnchoredMenu position={position} open={isMenuOpen} label={label} onClose={onMenuClose}>
        {items}
      </CursorAnchoredMenu>
      {dialogs}
    </>
  );
};

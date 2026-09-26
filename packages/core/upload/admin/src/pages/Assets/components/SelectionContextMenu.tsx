import { useEffect, useMemo, useState } from 'react';

import { Menu, Typography } from '@strapi/design-system';
import { ArrowRight, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { buildDragSetFromSelection } from '../../../utils/buildDragSetFromSelection';
import { getTranslationKey } from '../../../utils/translations';
import { useAssetSelection } from '../hooks/useAssetSelection';
import { useFolderNavigation } from '../hooks/useFolderNavigation';

import { BulkMoveDialog } from './BulkMoveDialog';
import { CursorAnchoredMenu, type CursorPosition } from './CursorAnchoredMenu';
import { DeleteItemsDialog } from './DeleteItemsDialog';

import type { ItemLocations } from '../../../utils/itemLocations';

interface SelectionContextMenuProps {
  position: CursorPosition;
  /**
   * Real location of every loaded row, so the move dialog validates each
   * selected item against its own parent — same input the bulk bar takes.
   */
  locations: ItemLocations;
  onClose: () => void;
}

/**
 * Right-clicking one of several selected items acts on the selection, the way a
 * file manager does. It offers the selection-scoped actions only — move and
 * delete — because the rest of the item menu has no meaning for a set: there is
 * no one link to copy and no one file to replace.
 *
 * The count leads, so what the menu is about to act on is stated before the
 * actions are. Right-clicking an item that is *not* in the selection replaces
 * the selection with it first, and `AssetContextMenu` handles it instead.
 */
export const SelectionContextMenu = ({
  position,
  locations,
  onClose,
}: SelectionContextMenuProps) => {
  const { formatMessage } = useIntl();
  // Move and delete are both `assets.update` server-side — one flag gates both.
  const { canUpdate, isLoading: isLoadingPermissions } = useMediaLibraryPermissions();
  const { selectedIds, selectedFolderIds, clear } = useAssetSelection();
  const { currentFolderId } = useFolderNavigation();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const count = selectedIds.size + selectedFolderIds.size;
  const isDialogOpen = isMoveOpen || isDeleteOpen;
  // `canUpdate` is `false` until the RBAC check settles. Closing on that would
  // dismiss the menu on its first render, before it ever paints.
  const hasActions = isLoadingPermissions || canUpdate;

  const moveItems = useMemo(
    () => buildDragSetFromSelection(selectedIds, selectedFolderIds, locations, currentFolderId),
    [selectedIds, selectedFolderIds, locations, currentFolderId]
  );

  // Nothing left on screen — the menu is shut and no dialog took its place.
  useEffect(() => {
    if (!isMenuOpen && !isDialogOpen) {
      onClose();
    }
  }, [isMenuOpen, isDialogOpen, onClose]);

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
        label={formatMessage({
          id: getTranslationKey('list.selection.context-menu.label'),
          defaultMessage: 'Selection actions',
        })}
        onClose={() => setIsMenuOpen(false)}
      >
        {/* A label rather than a `Menu.Item`: it states what the actions below
            will act on and is not itself selectable. */}
        <Menu.Label>
          <Typography variant="sigma" textColor="neutral600">
            {formatMessage(
              {
                id: getTranslationKey('list.selection.context-menu.count'),
                defaultMessage: '{number, plural, one {# item selected} other {# items selected}}',
              },
              { number: count }
            )}
          </Typography>
        </Menu.Label>
        <Menu.Separator />
        <Menu.Item startIcon={<ArrowRight />} onSelect={() => setIsMoveOpen(true)}>
          {formatMessage({
            id: getTranslationKey('list.bulk-actions.move'),
            defaultMessage: 'Move',
          })}
        </Menu.Item>
        <Menu.Item startIcon={<Trash />} variant="danger" onSelect={() => setIsDeleteOpen(true)}>
          {formatMessage({
            id: getTranslationKey('list.bulk-actions.delete'),
            defaultMessage: 'Delete',
          })}
        </Menu.Item>
      </CursorAnchoredMenu>
      {isMoveOpen && (
        <BulkMoveDialog
          open
          onClose={() => setIsMoveOpen(false)}
          items={moveItems}
          onSuccess={clear}
        />
      )}
      {isDeleteOpen && (
        <DeleteItemsDialog
          open
          onClose={() => setIsDeleteOpen(false)}
          target={{
            fileIds: Array.from(selectedIds),
            folderIds: Array.from(selectedFolderIds),
          }}
          onSuccess={clear}
        />
      )}
    </>
  );
};

import { useMemo, useState, type ReactNode } from 'react';

import { Menu, Typography } from '@strapi/design-system';
import { ArrowRight, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { buildDragSetFromSelection } from '../../../utils/buildDragSetFromSelection';
import { getTranslationKey } from '../../../utils/translations';
import { useAssetSelection } from '../hooks/useAssetSelection';
import { useFolderNavigation } from '../hooks/useFolderNavigation';

import { BulkMoveDialog } from './BulkMoveDialog';
import { DeleteItemsDialog } from './DeleteItemsDialog';

import type { ItemLocations } from '../../../utils/itemLocations';

interface SelectionActionsRender {
  /** How many items the actions would act on. Zero means nothing is selected. */
  count: number;
  /**
   * Whether there is anything to offer. False for a role that can read but not
   * update; true while the RBAC check is still settling, so a menu built on it
   * does not flash empty.
   */
  hasActions: boolean;
  /** The count label, a separator, then Move and Delete. */
  items: ReactNode;
  /** Rendered outside `Menu.Root` — a dialog has to outlive the menu that opened it. */
  dialogs: ReactNode;
  /** True while a dialog is open, for callers that unmount once nothing is on screen. */
  isBusy: boolean;
}

interface SelectionActionsProps {
  /**
   * Real location of every loaded row, so the move dialog validates each
   * selected item against its own parent — same input the bulk bar takes.
   */
  locations: ItemLocations;
  children: (actions: SelectionActionsRender) => ReactNode;
}

/**
 * The actions that apply to the current selection — move and delete — with no
 * opinion about which menu shows them.
 *
 * Two menus offer them: the one a right-click on a selected item opens, and the
 * background menu, which prepends them to its own creation actions whenever
 * something is selected. Sharing the items keeps the two from drifting, and
 * keeps one copy of the dialogs they open.
 *
 * Only move and delete: the rest of an item's menu has no meaning for a set —
 * there is no one link to copy and no one file to replace.
 */
export const SelectionActions = ({ locations, children }: SelectionActionsProps) => {
  const { formatMessage } = useIntl();
  // Move and delete are both `assets.update` server-side — one flag gates both.
  const { canUpdate, isLoading: isLoadingPermissions } = useMediaLibraryPermissions();
  const { selectedIds, selectedFolderIds, clear } = useAssetSelection();
  const { currentFolderId } = useFolderNavigation();
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const count = selectedIds.size + selectedFolderIds.size;
  const isBusy = isMoveOpen || isDeleteOpen;
  // `canUpdate` is `false` until the RBAC check settles. Reading it before then
  // would hide the actions on first render, or close a menu before it paints.
  const hasActions = isLoadingPermissions || canUpdate;

  const moveItems = useMemo(
    () => buildDragSetFromSelection(selectedIds, selectedFolderIds, locations, currentFolderId),
    [selectedIds, selectedFolderIds, locations, currentFolderId]
  );

  const items = (
    <>
      {/* A label rather than a `Menu.Item`: it states what the actions below
          will act on and is not itself selectable. */}
      <Menu.Label>
        <Typography variant="sigma" textColor="neutral600">
          {formatMessage(
            {
              id: getTranslationKey('list.bulk-actions.selected-count'),
              defaultMessage: '{count, plural, =1 {# item selected} other {# items selected}}',
            },
            { count }
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
    </>
  );

  const dialogs = (
    <>
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

  return <>{children({ count, hasActions, items, dialogs, isBusy })}</>;
};

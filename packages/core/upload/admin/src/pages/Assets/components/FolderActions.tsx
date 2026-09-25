import { useMemo, useState, type ReactNode } from 'react';

import { useClipboard, useNotification } from '@strapi/admin/strapi-admin';
import { Menu } from '@strapi/design-system';
import { ArrowRight, Link, Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../utils/translations';
import { useAssetSelectionOptional } from '../hooks/useAssetSelection';
import { folderKey } from '../utils/selection';

import { BulkMoveDialog } from './BulkMoveDialog';
import { DeleteItemsDialog } from './DeleteItemsDialog';
import { FolderFormDialog } from './FolderFormDialog';

import type { Folder } from '../../../../../shared/contracts/folders';
import type { DragFolderData } from '../../../types/dnd';

interface FolderActionsRender {
  /** The `Menu.Item`s, for whichever trigger is rendering them. */
  items: ReactNode;
  /**
   * The three dialogs. Rendered outside `Menu.Root` by every caller: Radix
   * unmounts menu content on close, and a dialog opened from a menu item has to
   * outlive the menu that opened it.
   */
  dialogs: ReactNode;
  /**
   * True while a dialog is open. A cursor-anchored caller is mounted only as
   * long as it has something on screen, so it needs this to know it must stay
   * around after the menu closes.
   */
  isBusy: boolean;
}

interface FolderActionsProps {
  /** Only the id and name are read, so a tree node satisfies this too. */
  folder: Pick<Folder, 'id' | 'name'>;
  /** Drag data for this folder, so the move dialog validates against its real parent. */
  dragData: DragFolderData;
  /**
   * Renaming is a list affordance. The folder tree offers the same menu without
   * it, so the two entry points there stay identical to each other.
   */
  showRename?: boolean;
  /** Receives the items and dialogs to place around whichever trigger it owns. */
  children: (actions: FolderActionsRender) => ReactNode;
}

/**
 * The folder actions themselves — items, dialogs and handlers — with no opinion
 * about how the menu is opened, mirroring `AssetActions`.
 *
 * Both entry points (the row's `•••` trigger and the right-click menu anchored
 * at the cursor) render what this gives them, so neither can drift from the
 * other.
 *
 * A successful move or delete deselects this one folder and leaves the rest of
 * the selection intact: they only invalidate RTK tags, so without it a
 * `folder:<id>` key for a folder that no longer lives where the selection thinks
 * it does would linger. A rename leaves the id valid and the folder in place, so
 * it touches the selection not at all.
 */
export const FolderActions = ({
  folder,
  dragData,
  showRename = true,
  children,
}: FolderActionsProps) => {
  const { formatMessage } = useIntl();
  const { copy } = useClipboard();
  const { toggleNotification } = useNotification();
  // Optional: the folder tree renders these actions outside the list's
  // selection, where there is nothing to deselect.
  const deselect = useAssetSelectionOptional()?.deselect;
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Stable identity: the move dialog memoizes its destination walk on it.
  const moveItems = useMemo(() => [dragData], [dragData]);

  // Built from window.location so the link inherits whatever path the library is
  // mounted at. Every other query param (search, sort, open drawer) is dropped —
  // this is a clean deep-link to the folder.
  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?folder=${folder.id}`;
    const didCopy = await copy(url);

    toggleNotification({
      type: didCopy ? 'success' : 'danger',
      message: formatMessage(
        didCopy
          ? {
              id: getTranslationKey('list.folder.actions.copy-link.success'),
              defaultMessage: 'Folder link copied.',
            }
          : {
              id: getTranslationKey('list.folder.actions.copy-link.error'),
              defaultMessage: 'Failed to copy the folder link.',
            }
      ),
    });
  };

  const items = (
    <>
      <Menu.Item startIcon={<Link />} onSelect={handleCopyLink}>
        {formatMessage({
          id: getTranslationKey('list.folder.actions.copy-link'),
          defaultMessage: 'Copy link to folder',
        })}
      </Menu.Item>
      <Menu.Separator />
      {/* TODO: gate Rename, Move and Delete on `assets.canUpdate` CMS-387 */}
      {showRename && (
        <Menu.Item startIcon={<Pencil />} onSelect={() => setIsRenameOpen(true)}>
          {formatMessage({
            id: getTranslationKey('list.folder.actions.rename'),
            defaultMessage: 'Rename folder',
          })}
        </Menu.Item>
      )}
      <Menu.Item startIcon={<ArrowRight />} onSelect={() => setIsMoveOpen(true)}>
        {formatMessage({
          id: getTranslationKey('list.folder.actions.move'),
          defaultMessage: 'Move to folder',
        })}
      </Menu.Item>
      <Menu.Item startIcon={<Trash />} variant="danger" onSelect={() => setIsDeleteOpen(true)}>
        {formatMessage({
          id: getTranslationKey('list.folder.actions.delete'),
          defaultMessage: 'Delete folder',
        })}
      </Menu.Item>
    </>
  );

  const dialogs = (
    <>
      {/* These dialogs live inside the row, so a background refetch that drops
          the row would take an open dialog with it. Nothing invalidates until
          the mutation resolves, and the dialog closes in the same tick, so the
          flows themselves can't trigger it. */}
      {showRename && isRenameOpen && (
        <FolderFormDialog
          open
          mode="rename"
          folderId={folder.id}
          initialName={folder.name}
          parentFolderId={dragData.parentId}
          onClose={() => setIsRenameOpen(false)}
        />
      )}
      {isMoveOpen && (
        <BulkMoveDialog
          open
          onClose={() => setIsMoveOpen(false)}
          items={moveItems}
          onSuccess={() => deselect?.(folderKey(folder.id))}
        />
      )}
      {isDeleteOpen && (
        <DeleteItemsDialog
          open
          onClose={() => setIsDeleteOpen(false)}
          target={{ fileIds: [], folderIds: [folder.id] }}
          onSuccess={() => deselect?.(folderKey(folder.id))}
        />
      )}
    </>
  );

  return <>{children({ items, dialogs, isBusy: isRenameOpen || isMoveOpen || isDeleteOpen })}</>;
};

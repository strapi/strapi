import { useMemo, useState } from 'react';

import { useClipboard, useNotification } from '@strapi/admin/strapi-admin';
import { IconButton, Menu } from '@strapi/design-system';
import { ArrowRight, Link, More, Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../utils/translations';
import { useAssetSelection } from '../hooks/useAssetSelection';

import { BulkMoveDialog } from './BulkMoveDialog';
import { DeleteItemsDialog } from './DeleteItemsDialog';
import { FolderFormDialog } from './FolderFormDialog';

import type { Folder } from '../../../../../../shared/contracts/folders';
import type { DragFolderData } from '../../../types/dnd';

interface FolderActionsMenuProps {
  folder: Folder;
  /** Drag data for this folder, so the move dialog validates against its real parent. */
  dragData: DragFolderData;
}

/**
 * The "..." menu on a folder row/card. Always acts on that one folder, whatever
 * the current multi-selection is (the bulk actions bar is the selection-scoped
 * affordance). It reuses the shared move and delete dialogs, which mount only
 * while open.
 *
 * A successful move or delete clears the whole selection: they only invalidate
 * RTK tags, so without it a `folder:<id>` key for a folder that no longer lives
 * where the selection thinks it does would linger. A rename leaves the id
 * valid, so it deliberately keeps the selection.
 */
export const FolderActionsMenu = ({ folder, dragData }: FolderActionsMenuProps) => {
  const { formatMessage } = useIntl();
  const { copy } = useClipboard();
  const { toggleNotification } = useNotification();
  const { clear } = useAssetSelection();
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Stable identity: the move dialog memoizes its destination walk on it.
  const moveItems = useMemo(() => [dragData], [dragData]);

  // Built from window.location rather than a route constant so the link keeps
  // working through the eventual `unstable-upload` → `upload` route rename. Every
  // other query param (search, sort, open drawer) is dropped — this is a clean
  // deep-link to the folder.
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

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          tag={IconButton}
          icon={<More />}
          variant="ghost"
          label={formatMessage({
            id: getTranslationKey('control-card.more-actions'),
            defaultMessage: 'More actions',
          })}
        />
        <Menu.Content popoverPlacement="bottom-end" zIndex={2} minWidth="22rem">
          <Menu.Item startIcon={<Link />} onSelect={handleCopyLink}>
            {formatMessage({
              id: getTranslationKey('list.folder.actions.copy-link'),
              defaultMessage: 'Copy link to folder',
            })}
          </Menu.Item>
          <Menu.Separator />
          {/* TODO: gate Rename, Move and Delete on `assets.canUpdate` CMS-387 */}
          <Menu.Item startIcon={<Pencil />} onSelect={() => setIsRenameOpen(true)}>
            {formatMessage({
              id: getTranslationKey('list.folder.actions.rename'),
              defaultMessage: 'Rename folder',
            })}
          </Menu.Item>
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
        </Menu.Content>
      </Menu.Root>
      {isRenameOpen && (
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
          onSuccess={clear}
        />
      )}
      {isDeleteOpen && (
        <DeleteItemsDialog
          open
          onClose={() => setIsDeleteOpen(false)}
          target={{ fileIds: [], folderIds: [folder.id] }}
          onSuccess={clear}
        />
      )}
    </>
  );
};

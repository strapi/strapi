import { useMemo, useState } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import { Box, Button, Flex, IconButton, Typography } from '@strapi/design-system';
import { ArrowRight, Cross, Sparkle, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useAIAvailability } from '../../../../hooks/useAiAvailability';
import { buildDragSetFromSelection } from '../../../utils/buildDragSetFromSelection';
import { getTranslationKey } from '../../../utils/translations';
import { useAssetSelection } from '../hooks/useAssetSelection';
import { useFolderNavigation } from '../hooks/useFolderNavigation';

import { BulkMoveDialog } from './BulkMoveDialog';
import { DeleteItemsDialog } from './DeleteItemsDialog';

/**
 * Floating bulk action bar for the future Media Library.
 *
 * TODO: create-metadata control is a styled stub (toast on click)
 */
const Bar = styled(Flex)`
  position: fixed;
  bottom: ${({ theme }) => theme.spaces[4]};
  left: 50%;
  transform: translateX(-50%);
  z-index: ${({ theme }) => theme.zIndices.popover};
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: ${({ theme }) =>
    `${theme.spaces[3]} ${theme.spaces[2]} ${theme.spaces[3]} ${theme.spaces[6]}`};
  background: ${({ theme }) => theme.colors.neutral0};
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.popupShadow};
`;

const ActionCluster = styled(Flex)`
  margin-left: auto;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
`;

const VerticalDivider = styled(Box)`
  width: 1px;
  align-self: stretch;
  background: ${({ theme }) => theme.colors.neutral150};
  margin-left: ${({ theme }) => theme.spaces[1]};
`;

export const BulkActionsBar = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { isEnabled: isAiMetadataEnabled } = useAIAvailability();
  const { selectedIds, selectedFolderIds, clear } = useAssetSelection();
  const { currentFolderId } = useFolderNavigation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  // The delete request lives in DeleteItemsDialog; the bar mirrors its pending
  // state so the rest of the controls stay disabled for the duration.
  const [isDeleting, setIsDeleting] = useState(false);

  const count = selectedIds.size + selectedFolderIds.size;

  // The selection is page-scoped, so every selected item lives in the folder
  // currently open. Stable identity: the move dialog memoizes its destination
  // walk on it.
  const moveItems = useMemo(
    () => buildDragSetFromSelection(selectedIds, selectedFolderIds, currentFolderId),
    [selectedIds, selectedFolderIds, currentFolderId]
  );

  const showStubNotification = (translationKey: string, defaultMessage: string) => {
    toggleNotification({
      type: 'info',
      message: formatMessage({
        id: getTranslationKey(translationKey),
        defaultMessage,
      }),
    });
  };

  if (count === 0) {
    return null;
  }

  return (
    <Bar
      tag="section"
      role="region"
      aria-label={formatMessage({
        id: getTranslationKey('list.bulk-actions.label'),
        defaultMessage: 'Bulk actions',
      })}
    >
      <Typography fontWeight="bold" textColor="neutral800" marginRight={4}>
        {formatMessage(
          {
            id: getTranslationKey('list.bulk-actions.selected-count'),
            defaultMessage: '{count, plural, =1 {# item selected} other {# items selected}}',
          },
          { count }
        )}
      </Typography>

      <ActionCluster>
        {isAiMetadataEnabled && (
          <Button
            size="S"
            startIcon={<Sparkle />}
            disabled={isDeleting}
            onClick={() =>
              showStubNotification(
                'list.bulk-actions.create-metadata-not-available',
                "Generate metadata isn't available yet"
              )
            }
          >
            {formatMessage({
              id: getTranslationKey('list.bulk-actions.create-metadata'),
              defaultMessage: 'Create metadata',
            })}
          </Button>
        )}

        <IconButton
          variant="tertiary"
          disabled={isDeleting}
          label={formatMessage({
            id: getTranslationKey('list.bulk-actions.move'),
            defaultMessage: 'Move',
          })}
          onClick={() => setIsMoveDialogOpen(true)}
        >
          <ArrowRight />
        </IconButton>
        <BulkMoveDialog
          open={isMoveDialogOpen}
          onClose={() => setIsMoveDialogOpen(false)}
          items={moveItems}
          onSuccess={clear}
        />

        <IconButton
          variant="danger-light"
          disabled={isDeleting}
          label={formatMessage({
            id: getTranslationKey('list.bulk-actions.delete'),
            defaultMessage: 'Delete',
          })}
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          <Trash />
        </IconButton>
        <DeleteItemsDialog
          open={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          target={{
            fileIds: Array.from(selectedIds),
            folderIds: Array.from(selectedFolderIds),
          }}
          onSuccess={clear}
          onPendingChange={setIsDeleting}
        />
      </ActionCluster>

      <VerticalDivider aria-hidden />

      <IconButton
        variant="ghost"
        label={formatMessage({
          id: getTranslationKey('list.bulk-actions.clear'),
          defaultMessage: 'Clear selection',
        })}
        onClick={clear}
        disabled={isDeleting}
      >
        <Cross />
      </IconButton>
    </Bar>
  );
};

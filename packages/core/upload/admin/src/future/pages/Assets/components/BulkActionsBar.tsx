import { useState, type MouseEvent } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import { Box, Button, Dialog, Flex, IconButton, Typography } from '@strapi/design-system';
import { ArrowRight, Cross, Sparkle, Trash, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useAIAvailability } from '../../../../hooks/useAiAvailability';
import { useBulkDeleteItemsMutation } from '../../../services/assets';
import { getTranslationKey } from '../../../utils/translations';
import { useAssetSelection } from '../hooks/useAssetSelection';

import { BulkMoveDialog } from './BulkMoveDialog';

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
  const [bulkDeleteItems, { isLoading: isDeleting }] = useBulkDeleteItemsMutation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);

  const count = selectedIds.size + selectedFolderIds.size;

  const showStubNotification = (translationKey: string, defaultMessage: string) => {
    toggleNotification({
      type: 'info',
      message: formatMessage({
        id: getTranslationKey(translationKey),
        defaultMessage,
      }),
    });
  };

  const handleConfirmDelete = async (e: MouseEvent) => {
    // Radix AlertDialog.Action closes the dialog on click by default; prevent
    // that so the dialog stays open showing the loader while the request runs
    // (a bulk delete can take a while depending on the number of assets).
    e.preventDefault();

    // Guard re-entry while pending.
    if (isDeleting) {
      return;
    }

    const res = await bulkDeleteItems({
      fileIds: Array.from(selectedIds),
      folderIds: Array.from(selectedFolderIds),
    });

    if ('error' in res) {
      // Keep the dialog open and the selection intact so the user can retry
      // (Confirm again) or Cancel; only surface the error toast.
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: getTranslationKey('list.bulk-actions.delete.error'),
          defaultMessage: 'An error occurred while deleting the items.',
        }),
      });
      return;
    }

    setIsDeleteDialogOpen(false);
    toggleNotification({
      type: 'success',
      message: formatMessage(
        {
          id: getTranslationKey('list.bulk-actions.delete.success'),
          defaultMessage:
            '{count, plural, =1 {# item has been deleted} other {# items have been deleted}}',
        },
        { count }
      ),
    });
    clear();
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
        <BulkMoveDialog open={isMoveDialogOpen} onClose={() => setIsMoveDialogOpen(false)} />

        <Dialog.Root
          open={isDeleteDialogOpen}
          onOpenChange={(open: boolean) => {
            // The dialog must stay open while the request runs — a bulk delete
            // can't be aborted halfway, so the loader is the source of truth.
            if (!isDeleting) {
              setIsDeleteDialogOpen(open);
            }
          }}
        >
          <Dialog.Trigger>
            <IconButton
              variant="danger-light"
              disabled={isDeleting}
              label={formatMessage({
                id: getTranslationKey('list.bulk-actions.delete'),
                defaultMessage: 'Delete',
              })}
            >
              <Trash />
            </IconButton>
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              {formatMessage(
                {
                  id: getTranslationKey('list.bulk-actions.delete.confirm.title'),
                  defaultMessage: 'Delete {count, plural, =1 {# item} other {# items}}?',
                },
                { count }
              )}
            </Dialog.Header>
            <Dialog.Body
              icon={<WarningCircle width="24px" height="24px" fill="danger600" />}
              textAlign="center"
            >
              <Typography>
                {formatMessage({
                  id: getTranslationKey(
                    'list.bulk-actions.delete.confirm.description.are-you-sure'
                  ),
                  defaultMessage:
                    'These items cannot be recovered once deleted, and deleting a folder also deletes everything inside it. If they are currently in use, linked content will break and image containers will be empty.',
                })}
              </Typography>
              <Typography>
                {formatMessage({
                  id: getTranslationKey(
                    'list.bulk-actions.delete.confirm.description.cant-be-undone'
                  ),
                  defaultMessage:
                    'This action can’t be undone. Deleting a folder also removes everything inside it, and any linked content will break – media asset containers will appear empty.',
                })}
              </Typography>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.Cancel>
                <Button variant="tertiary" disabled={isDeleting} fullWidth>
                  {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
                </Button>
              </Dialog.Cancel>
              <Dialog.Action>
                <Button
                  variant="danger-light"
                  loading={isDeleting}
                  onClick={handleConfirmDelete}
                  fullWidth
                >
                  {formatMessage({
                    id: 'app.components.Button.confirm',
                    defaultMessage: 'Confirm',
                  })}
                </Button>
              </Dialog.Action>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
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

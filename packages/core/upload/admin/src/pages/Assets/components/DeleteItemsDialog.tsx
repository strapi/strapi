import { useEffect, type MouseEvent } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import { Button, Dialog, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useBulkDeleteItemsMutation } from '../../../services/assets';
import { getTranslationKey } from '../../../utils/translations';

interface DeleteItemsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Explicit delete target — assets and/or folders, by id. */
  target: { fileIds: number[]; folderIds: number[] };
  /** Called after a successful delete, before the toast. */
  onSuccess?: () => void;
  /**
   * Mirrors the in-flight state out to the caller, so a host that has its own
   * controls (the bulk actions bar) can disable them for the duration.
   */
  onPendingChange?: (pending: boolean) => void;
}

/**
 * Confirm dialog for `POST /upload/actions/bulk-delete`. Fully controlled: the
 * caller owns `open` and renders its own trigger. Shared by the bulk actions bar
 * (selection-scoped) and the per-folder actions menu (item-scoped), so the
 * target is always passed in explicitly rather than read from the selection.
 *
 * Deleting a folder cascades server-side, which is why the copy warns about
 * folder contents even for a single item.
 */
export const DeleteItemsDialog = ({
  open,
  onClose,
  target,
  onSuccess,
  onPendingChange,
}: DeleteItemsDialogProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const [bulkDeleteItems, { isLoading: isDeleting }] = useBulkDeleteItemsMutation();

  const count = target.fileIds.length + target.folderIds.length;

  useEffect(() => {
    onPendingChange?.(isDeleting);
  }, [isDeleting, onPendingChange]);

  const handleConfirmDelete = async (e: MouseEvent) => {
    // Radix AlertDialog.Action closes the dialog on click by default; prevent
    // that so the dialog stays open showing the loader while the request runs
    // (a bulk delete can take a while depending on the number of assets).
    e.preventDefault();

    // Guard re-entry while pending.
    if (isDeleting) {
      return;
    }

    const res = await bulkDeleteItems(target);

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

    onClose();
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
    onSuccess?.();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        // The dialog must stay open while the request runs — a bulk delete
        // can't be aborted halfway, so the loader is the source of truth.
        if (!nextOpen && !isDeleting) {
          onClose();
        }
      }}
    >
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
              id: getTranslationKey('list.bulk-actions.delete.confirm.description.are-you-sure'),
              defaultMessage:
                'These items cannot be recovered once deleted, and deleting a folder also deletes everything inside it. If they are currently in use, linked content will break and image containers will be empty.',
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
  );
};

import { Button, Dialog, DialogBody, DialogFooter, Flex, Typography } from '@strapi/design-system';
import { ExclamationMarkCircle, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { InjectionZoneList } from './InjectionZoneList';

interface DialogConfirmDeleteProps {
  isConfirmButtonLoading?: boolean;
  isOpen?: boolean;
  onConfirm: () => void;
  onToggleDialog: () => void;
}

const DialogConfirmDelete = ({
  isConfirmButtonLoading = false,
  isOpen = false,
  onToggleDialog,
  onConfirm,
}: DialogConfirmDeleteProps) => {
  const { formatMessage } = useIntl();

  return (
    <Dialog
      onClose={onToggleDialog}
      title={formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      })}
      isOpen={isOpen}
    >
      <DialogBody icon={<ExclamationMarkCircle />}>
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Flex justifyContent="center">
            <Typography id="confirm-description">
              {formatMessage({
                id: 'components.popUpWarning.message',
                defaultMessage: 'Are you sure you want to delete this?',
              })}
            </Typography>
          </Flex>
          <Flex>
            <InjectionZoneList area="contentManager.listView.deleteModalAdditionalInfos" />
          </Flex>
        </Flex>
      </DialogBody>
      <DialogFooter
        startAction={
          <Button onClick={onToggleDialog} variant="tertiary">
            {formatMessage({
              id: 'app.components.Button.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
        endAction={
          <Button
            onClick={onConfirm}
            variant="danger-light"
            startIcon={<Trash />}
            id="confirm-delete"
            loading={isConfirmButtonLoading}
          >
            {formatMessage({
              id: 'app.components.Button.confirm',
              defaultMessage: 'Confirm',
            })}
          </Button>
        }
      />
    </Dialog>
  );
};

export { DialogConfirmDelete };
export type { DialogConfirmDeleteProps };

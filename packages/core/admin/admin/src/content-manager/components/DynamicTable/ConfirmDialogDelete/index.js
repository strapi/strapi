import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Dialog, DialogBody, DialogFooter } from '@strapi/parts/Dialog';
import { Stack } from '@strapi/parts/Stack';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import { Button } from '@strapi/parts/Button';
import AlertWarningIcon from '@strapi/icons/AlertWarningIcon';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import InjectionZoneList from '../../InjectionZoneList';

const ConfirmDialogDelete = ({ isConfirmButtonLoading, isOpen, onToggleDialog, onConfirm }) => {
  const { formatMessage } = useIntl();

  return (
    <Dialog
      onClose={onToggleDialog}
      title={formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      })}
      labelledBy="confirmation"
      describedBy="confirm-description"
      isOpen={isOpen}
    >
      <DialogBody icon={<AlertWarningIcon />}>
        <Stack size={2}>
          <Row justifyContent="center">
            <Text id="confirm-description">
              {formatMessage({
                id: 'components.popUpWarning.message',
                defaultMessage: 'Are you sure you want to delete this?',
              })}
            </Text>
          </Row>
          <Row>
            <InjectionZoneList area="contentManager.listView.deleteModalAdditionalInfos" />
          </Row>
        </Stack>
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
            startIcon={<DeleteIcon />}
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

ConfirmDialogDelete.propTypes = {
  isConfirmButtonLoading: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onToggleDialog: PropTypes.func.isRequired,
};

export default ConfirmDialogDelete;

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

const ConfirmDialog = ({ onToggleDialog, onConfirm, isVisible }) => {
  const { formatMessage } = useIntl();

  if (!isVisible) {
    return null;
  }

  return (
    <Dialog
      onClose={onToggleDialog}
      title={formatMessage({
        id: 'Settings.webhooks.confirmation',
        defaultMessage: 'Confirmation',
      })}
      labelledBy="confirmation"
      describedBy="confirm-description"
    >
      <DialogBody icon={<AlertWarningIcon />}>
        <Stack size={2}>
          <Row justifyContent="center">
            <Text id="confirm-description">
              {formatMessage({
                id: 'Settings.webhooks.confirmation.delete',
                defaultMessage: 'Are you sure you want to delete this?',
              })}
            </Text>
          </Row>
        </Stack>
      </DialogBody>
      <DialogFooter
        startAction={
          <Button onClick={onToggleDialog} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
        }
        endAction={
          <Button
            onClick={onConfirm}
            variant="danger-light"
            startIcon={<DeleteIcon />}
            id="confirm-delete"
          >
            {formatMessage({ id: 'app.components.Button.confirm', defaultMessage: 'Confirm' })}
          </Button>
        }
      />
    </Dialog>
  );
};

ConfirmDialog.propTypes = {
  onToggleDialog: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  isVisible: PropTypes.bool.isRequired,
};

export default ConfirmDialog;

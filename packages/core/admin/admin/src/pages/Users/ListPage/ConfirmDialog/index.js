/**
 * This component is temporary
 * FIXME migrate to the common one
 */
import React from 'react';
import { Button } from '@strapi/parts/Button';
import { Dialog, DialogBody, DialogFooter } from '@strapi/parts/Dialog';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { Text } from '@strapi/parts/Text';
import { AlertWarningIcon, DeleteIcon } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const ConfirmDialog = ({ isConfirmButtonLoading, onConfirm, onToggle, show }) => {
  const { formatMessage } = useIntl();

  if (!show) {
    return null;
  }

  return (
    <Dialog
      onClose={onToggle}
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
          <Button onClick={onToggle} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
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
            {formatMessage({ id: 'app.components.Button.confirm', defaultMessage: 'Confirm' })}
          </Button>
        }
      />
    </Dialog>
  );
};

ConfirmDialog.defaultProps = {
  isConfirmButtonLoading: false,
};

ConfirmDialog.propTypes = {
  isConfirmButtonLoading: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
};

export default ConfirmDialog;

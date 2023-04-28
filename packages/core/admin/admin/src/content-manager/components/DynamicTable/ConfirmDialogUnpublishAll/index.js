import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Dialog, DialogBody, DialogFooter, Flex, Typography, Button } from '@strapi/design-system';
import { ExclamationMarkCircle, Check } from '@strapi/icons';
import InjectionZoneList from '../../InjectionZoneList';
import { getTrad } from '../../../utils';

const ConfirmDialogUnpublishAll = ({
  isConfirmButtonLoading,
  isOpen,
  onToggleDialog,
  onConfirm,
}) => {
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
      <DialogBody icon={<ExclamationMarkCircle />}>
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Flex justifyContent="center">
            <Typography id="confirm-description">
              {formatMessage({
                id: getTrad('popUpWarning.bodyMessage.contentType.unpublish.all'),
                defaultMessage: 'Are you sure you want to unpublish these entries?',
              })}
            </Typography>
          </Flex>
          <Flex>
            <InjectionZoneList area="contentManager.listView.unpublishModalAdditionalInfos" />
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
            variant="secondary"
            startIcon={<Check />}
            data-testid="confirm-unpublish"
            loading={isConfirmButtonLoading}
          >
            {formatMessage({
              id: 'app.utils.unpublish',
              defaultMessage: 'Unpublish',
            })}
          </Button>
        }
      />
    </Dialog>
  );
};

ConfirmDialogUnpublishAll.propTypes = {
  isConfirmButtonLoading: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onToggleDialog: PropTypes.func.isRequired,
};

export default ConfirmDialogUnpublishAll;

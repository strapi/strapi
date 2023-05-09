import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Dialog, DialogBody, DialogFooter, Flex, Typography } from '@strapi/design-system';
import { Check, ExclamationMarkCircle, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useTracking } from '@strapi/helper-plugin';
import { getTrad } from '../../../utils';
import InjectionZoneList from '../../InjectionZoneList';

const ConfirmBulkActionDialog = ({ onToggleDialog, isOpen, dialogBody, endAction }) => {
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
          {dialogBody}
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
        endAction={endAction}
      />
    </Dialog>
  );
};

ConfirmBulkActionDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggleDialog: PropTypes.func.isRequired,
  dialogBody: PropTypes.node.isRequired,
  endAction: PropTypes.node.isRequired,
};

const confirmDialogsPropTypes = {
  isConfirmButtonLoading: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onToggleDialog: PropTypes.func.isRequired,
};

const ConfirmDialogPublishAll = ({ isOpen, onToggleDialog, isConfirmButtonLoading, onConfirm }) => {
  const { formatMessage } = useIntl();

  return (
    <ConfirmBulkActionDialog
      isOpen={isOpen}
      onToggleDialog={onToggleDialog}
      dialogBody={
        <>
          <Typography id="confirm-description" textAlign="center">
            {formatMessage({
              id: getTrad('popUpWarning.bodyMessage.contentType.publish.all'),
              defaultMessage: 'Are you sure you want to publish these entries?',
            })}
          </Typography>
          <InjectionZoneList area="contentManager.listView.publishModalAdditionalInfos" />
        </>
      }
      endAction={
        <Button
          onClick={onConfirm}
          variant="secondary"
          startIcon={<Check />}
          loading={isConfirmButtonLoading}
        >
          {formatMessage({
            id: 'app.utils.publish',
            defaultMessage: 'Publish',
          })}
        </Button>
      }
    />
  );
};

ConfirmDialogPublishAll.propTypes = confirmDialogsPropTypes;

const ConfirmDialogUnpublishAll = ({
  isOpen,
  onToggleDialog,
  isConfirmButtonLoading,
  onConfirm,
}) => {
  const { formatMessage } = useIntl();

  return (
    <ConfirmBulkActionDialog
      isOpen={isOpen}
      onToggleDialog={onToggleDialog}
      dialogBody={
        <>
          <Typography id="confirm-description" textAlign="center">
            {formatMessage({
              id: getTrad('popUpWarning.bodyMessage.contentType.unpublish.all'),
              defaultMessage: 'Are you sure you want to unpublish these entries?',
            })}
          </Typography>
          <InjectionZoneList area="contentManager.listView.unpublishModalAdditionalInfos" />
        </>
      }
      endAction={
        <Button
          onClick={onConfirm}
          variant="secondary"
          startIcon={<Check />}
          loading={isConfirmButtonLoading}
        >
          {formatMessage({
            id: 'app.utils.unpublish',
            defaultMessage: 'Unpublish',
          })}
        </Button>
      }
    />
  );
};

ConfirmDialogUnpublishAll.propTypes = confirmDialogsPropTypes;

const ConfirmDialogDeleteAll = ({ isOpen, onToggleDialog, isConfirmButtonLoading, onConfirm }) => {
  const { formatMessage } = useIntl();

  return (
    <ConfirmBulkActionDialog
      isOpen={isOpen}
      onToggleDialog={onToggleDialog}
      dialogBody={
        <>
          <Typography id="confirm-description" textAlign="center">
            {formatMessage({
              id: getTrad('popUpWarning.bodyMessage.contentType.delete.all'),
              defaultMessage: 'Are you sure you want to delete these entries?',
            })}
          </Typography>
          <InjectionZoneList area="contentManager.listView.deleteModalAdditionalInfos" />
        </>
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
  );
};

ConfirmDialogDeleteAll.propTypes = confirmDialogsPropTypes;

const BulkActionsBar = ({
  showPublish,
  showDelete,
  onConfirmDeleteAll,
  onConfirmPublishAll,
  onConfirmUnpublishAll,
  selectedEntries,
  clearSelectedEntries,
}) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [isConfirmButtonLoading, setIsConfirmButtonLoading] = useState(false);
  const [dialogToOpen, setDialogToOpen] = useState(null);

  const toggleDeleteModal = () => {
    if (dialogToOpen === 'delete') {
      setDialogToOpen(null);
    } else {
      setDialogToOpen('delete');
      trackUsage('willBulkDeleteEntries');
    }
  };

  const togglePublishModal = () => {
    if (dialogToOpen === 'publish') {
      setDialogToOpen(null);
    } else {
      setDialogToOpen('publish');
      trackUsage('willBulkPublishEntries');
    }
  };

  const toggleUnpublishModal = () => {
    if (dialogToOpen === 'unpublish') {
      setDialogToOpen(null);
    } else {
      setDialogToOpen('unpublish');
      trackUsage('willBulkUnpublishEntries');
    }
  };

  const handleBulkDelete = async () => {
    let result = null;

    try {
      setIsConfirmButtonLoading(true);
      result = await onConfirmDeleteAll(selectedEntries);
    } catch (err) {
      // The error is handled in content-manager/pages/ListView/index.js
      // handleConfirmDeleteAllData catch block
    } finally {
      setIsConfirmButtonLoading(false);
      toggleDeleteModal();
    }

    if (result) {
      clearSelectedEntries();
    }
  };

  const handleBulkPublish = async () => {
    let result = null;

    try {
      setIsConfirmButtonLoading(true);
      result = await onConfirmPublishAll(selectedEntries);
    } catch (error) {
      // The error is handled in content-manager/pages/ListView/index.js
      // bulkPublishMutation onError callback
    } finally {
      setIsConfirmButtonLoading(false);
      togglePublishModal();
    }

    if (result) {
      clearSelectedEntries();
    }
  };

  const handleBulkUnpublish = async () => {
    let result = null;

    try {
      setIsConfirmButtonLoading(true);
      await onConfirmUnpublishAll(selectedEntries);
    } catch (error) {
      // The error is handled in content-manager/pages/ListView/index.js
      // bulkUnpublishMutation onError callback
    } finally {
      setIsConfirmButtonLoading(false);
      toggleUnpublishModal();
    }

    if (result) {
      clearSelectedEntries();
    }
  };

  return (
    <>
      {showPublish && (
        <>
          <Button variant="tertiary" onClick={togglePublishModal}>
            {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
          </Button>
          <Button variant="tertiary" onClick={toggleUnpublishModal}>
            {formatMessage({ id: 'app.utils.unpublish', defaultMessage: 'Unpublish' })}
          </Button>
          <ConfirmDialogPublishAll
            isOpen={dialogToOpen === 'publish'}
            onToggleDialog={togglePublishModal}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleBulkPublish}
          />
          <ConfirmDialogUnpublishAll
            isOpen={dialogToOpen === 'unpublish'}
            onToggleDialog={toggleUnpublishModal}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleBulkUnpublish}
          />
        </>
      )}
      {showDelete && (
        <>
          <Button variant="danger-light" onClick={toggleDeleteModal}>
            {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
          </Button>
          <ConfirmDialogDeleteAll
            isOpen={dialogToOpen === 'delete'}
            onToggleDialog={toggleDeleteModal}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleBulkDelete}
          />
        </>
      )}
    </>
  );
};

BulkActionsBar.defaultProps = {
  showPublish: false,
  showDelete: false,
  onConfirmDeleteAll() {},
  onConfirmPublishAll() {},
  onConfirmUnpublishAll() {},
};

BulkActionsBar.propTypes = {
  showPublish: PropTypes.bool,
  showDelete: PropTypes.bool,
  onConfirmDeleteAll: PropTypes.func,
  onConfirmPublishAll: PropTypes.func,
  onConfirmUnpublishAll: PropTypes.func,
  selectedEntries: PropTypes.array.isRequired,
  clearSelectedEntries: PropTypes.func.isRequired,
};

export default BulkActionsBar;

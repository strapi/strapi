import * as React from 'react';

import { Button, Flex, Dialog, DialogBody, DialogFooter, Typography } from '@strapi/design-system';
import { useTracking, useTableContext } from '@strapi/helper-plugin';
import { Check, ExclamationMarkCircle, Trash } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import InjectionZoneList from '../../../../components/InjectionZoneList';
import { getTrad } from '../../../../utils';
import { listViewDomain } from '../../selectors';

import SelectedEntriesModal from './SelectedEntriesModal';

/* -------------------------------------------------------------------------------------------------
 * ConfirmBulkActionDialog
 * -----------------------------------------------------------------------------------------------*/

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

/* -------------------------------------------------------------------------------------------------
 * ConfirmDialogPublishAll
 * -----------------------------------------------------------------------------------------------*/

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

/* -------------------------------------------------------------------------------------------------
 * ConfirmDialogUnpublishAll
 * -----------------------------------------------------------------------------------------------*/

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

/* -------------------------------------------------------------------------------------------------
 * ConfirmDialogDeleteAll
 * -----------------------------------------------------------------------------------------------*/

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

/* -------------------------------------------------------------------------------------------------
 * BulkActionButtons
 * -----------------------------------------------------------------------------------------------*/

const BulkActionButtons = ({
  showPublish,
  showDelete,
  onConfirmDeleteAll,
  onConfirmPublishAll,
  onConfirmUnpublishAll,
}) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { data } = useSelector(listViewDomain());
  const { selectedEntries, setSelectedEntries } = useTableContext();

  const [isConfirmButtonLoading, setIsConfirmButtonLoading] = React.useState(false);
  const [isSelectedEntriesModalOpen, setIsSelectedEntriesModalOpen] = React.useState(false);
  const [dialogToOpen, setDialogToOpen] = React.useState(null);

  // Filters for Bulk actions
  const selectedEntriesObjects = data.filter((entry) => selectedEntries.includes(entry.id));
  const publishButtonIsShown =
    showPublish && selectedEntriesObjects.some((entry) => !entry.publishedAt);
  const unpublishButtonIsShown =
    showPublish && selectedEntriesObjects.some((entry) => entry.publishedAt);

  const toggleDeleteDialog = () => {
    if (dialogToOpen === 'delete') {
      setDialogToOpen(null);
    } else {
      setDialogToOpen('delete');
      trackUsage('willBulkDeleteEntries');
    }
  };

  const togglePublishDialog = () => {
    if (dialogToOpen === 'publish') {
      setDialogToOpen(null);
    } else {
      setDialogToOpen('publish');
      trackUsage('willBulkPublishEntries');
    }
  };

  const toggleUnpublishDialog = () => {
    if (dialogToOpen === 'unpublish') {
      setDialogToOpen(null);
    } else {
      setDialogToOpen('unpublish');
      trackUsage('willBulkUnpublishEntries');
    }
  };

  const handleBulkAction = async (confirmAction, toggleDialog) => {
    try {
      setIsConfirmButtonLoading(true);
      await confirmAction(selectedEntries);
      setIsConfirmButtonLoading(false);
      toggleDialog();
      setSelectedEntries([]);
    } catch (error) {
      setIsConfirmButtonLoading(false);
      toggleDialog();
    }
  };

  const handleBulkDelete = () => handleBulkAction(onConfirmDeleteAll, toggleDeleteDialog);
  const handleBulkUnpublish = () => handleBulkAction(onConfirmUnpublishAll, toggleUnpublishDialog);
  const handleBulkPublish = () => handleBulkAction(onConfirmPublishAll, togglePublishDialog);
  const handleToggleSelectedEntriesModal = () => setIsSelectedEntriesModalOpen((prev) => !prev);

  return (
    <>
      {publishButtonIsShown && (
        <>
          <Button variant="tertiary" onClick={() => setIsSelectedEntriesModalOpen(true)}>
            {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
          </Button>
          {isSelectedEntriesModalOpen && (
            <SelectedEntriesModal
              onToggle={handleToggleSelectedEntriesModal}
              onConfirm={togglePublishDialog}
            />
          )}
          <ConfirmDialogPublishAll
            isOpen={dialogToOpen === 'publish'}
            onToggleDialog={togglePublishDialog}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleBulkPublish}
          />
        </>
      )}
      {unpublishButtonIsShown && (
        <>
          <Button variant="tertiary" onClick={toggleUnpublishDialog}>
            {formatMessage({ id: 'app.utils.unpublish', defaultMessage: 'Unpublish' })}
          </Button>
          <ConfirmDialogUnpublishAll
            isOpen={dialogToOpen === 'unpublish'}
            onToggleDialog={toggleUnpublishDialog}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleBulkUnpublish}
          />
        </>
      )}
      {showDelete && (
        <>
          <Button variant="danger-light" onClick={toggleDeleteDialog}>
            {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
          </Button>
          <ConfirmDialogDeleteAll
            isOpen={dialogToOpen === 'delete'}
            onToggleDialog={toggleDeleteDialog}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleBulkDelete}
          />
        </>
      )}
    </>
  );
};

BulkActionButtons.defaultProps = {
  showPublish: false,
  showDelete: false,
  onConfirmDeleteAll() {},
  onConfirmPublishAll() {},
  onConfirmUnpublishAll() {},
};

BulkActionButtons.propTypes = {
  showPublish: PropTypes.bool,
  showDelete: PropTypes.bool,
  onConfirmDeleteAll: PropTypes.func,
  onConfirmPublishAll: PropTypes.func,
  onConfirmUnpublishAll: PropTypes.func,
};

export default BulkActionButtons;

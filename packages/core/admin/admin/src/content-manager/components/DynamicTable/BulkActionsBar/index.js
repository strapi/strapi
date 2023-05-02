import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useTracking } from '@strapi/helper-plugin';
import ConfirmDialogDeleteAll from '../ConfirmDialogDeleteAll';
import ConfirmDialogPublishAll from '../ConfirmDialogPublishAll';
import ConfirmDialogUnpublishAll from '../ConfirmDialogUnpublishAll';

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

  // Bulk delete
  const handleToggleShowDeleteAllModal = () => {
    if (dialogToOpen === 'delete') {
      setDialogToOpen(null);
    } else {
      setDialogToOpen('delete');
      trackUsage('willBulkDeleteEntries');
    }
  };

  const handleConfirmDeleteAll = async () => {
    try {
      setIsConfirmButtonLoading(true);
      await onConfirmDeleteAll(selectedEntries);
      handleToggleShowDeleteAllModal();
      clearSelectedEntries();
      setIsConfirmButtonLoading(false);
    } catch (err) {
      setIsConfirmButtonLoading(false);
      handleToggleShowDeleteAllModal();
    }
  };

  // Bulk publish
  const handleToggleShowPublishAllModal = () => {
    if (dialogToOpen === 'publish') {
      setDialogToOpen(null);
    } else {
      setDialogToOpen('publish');
      trackUsage('willBulkPublishEntries');
    }
  };

  const handleConfirmPublishAll = async () => {
    try {
      setIsConfirmButtonLoading(true);
      await onConfirmPublishAll(selectedEntries);
      handleToggleShowPublishAllModal();
      clearSelectedEntries();
      setIsConfirmButtonLoading(false);
    } catch (err) {
      setIsConfirmButtonLoading(false);
      handleToggleShowPublishAllModal();
    }
  };

  // Bulk unpublish
  const handleToggleShowUnpublishAllModal = () => {
    if (dialogToOpen === 'unpublish') {
      setDialogToOpen(null);
    } else {
      setDialogToOpen('unpublish');
      trackUsage('willBulkUnpublishEntries');
    }
  };

  const handleConfirmUnpublishAll = async () => {
    try {
      setIsConfirmButtonLoading(true);
      await onConfirmUnpublishAll(selectedEntries);
      handleToggleShowUnpublishAllModal();
      clearSelectedEntries();
      setIsConfirmButtonLoading(false);
    } catch (err) {
      setIsConfirmButtonLoading(false);
      handleToggleShowUnpublishAllModal();
    }
  };

  return (
    <>
      {showPublish && (
        <>
          <Button variant="tertiary" onClick={handleToggleShowPublishAllModal}>
            {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
          </Button>
          <Button variant="tertiary" onClick={handleToggleShowUnpublishAllModal}>
            {formatMessage({ id: 'app.utils.unpublish', defaultMessage: 'Unpublish' })}
          </Button>
          <ConfirmDialogPublishAll
            isOpen={dialogToOpen === 'publish'}
            onToggleDialog={handleToggleShowPublishAllModal}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleConfirmPublishAll}
          />
          <ConfirmDialogUnpublishAll
            isOpen={dialogToOpen === 'unpublish'}
            onToggleDialog={handleToggleShowUnpublishAllModal}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleConfirmUnpublishAll}
          />
        </>
      )}
      {showDelete && (
        <>
          <Button variant="danger-light" onClick={handleToggleShowDeleteAllModal}>
            {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
          </Button>
          <ConfirmDialogDeleteAll
            isOpen={dialogToOpen === 'delete'}
            onToggleDialog={handleToggleShowDeleteAllModal}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleConfirmDeleteAll}
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

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useTracking } from '@strapi/helper-plugin';
import ConfirmDialogDeleteAll from '../ConfirmDialogDeleteAll';
import ConfirmDialogPublishAll from '../ConfirmDialogPublishAll';

const BulkActionsBar = ({
  showPublish,
  showDelete,
  onConfirmDeleteAll,
  onConfirmPublishAll,
  selectedEntries,
  clearSelectedEntries,
}) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [isConfirmButtonLoading, setIsConfirmButtonLoading] = useState(false);

  // Bulk delete
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const handleToggleShowDeleteAllModal = () => {
    if (!showConfirmDeleteAll) {
      trackUsage('willBulkDeleteEntries');
    }

    setShowConfirmDeleteAll((prev) => !prev);
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
  const [showConfirmPublishAll, setShowConfirmPublishAll] = useState(false);
  const handleToggleShowPublishAllModal = () => {
    if (!showConfirmPublishAll) {
      trackUsage('willBulkPublishEntries');
    }

    setShowConfirmPublishAll((prev) => !prev);
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

  return (
    <>
      {showPublish && (
        <>
          <Button variant="tertiary" onClick={handleToggleShowPublishAllModal}>
            {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
          </Button>
          <Button variant="tertiary">
            {formatMessage({ id: 'app.utils.unpublish', defaultMessage: 'Unpublish' })}
          </Button>
          <ConfirmDialogPublishAll
            isOpen={showConfirmPublishAll}
            onToggleDialog={handleToggleShowPublishAllModal}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleConfirmPublishAll}
          />
        </>
      )}
      {showDelete && (
        <>
          <Button variant="danger-light" onClick={handleToggleShowDeleteAllModal}>
            {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
          </Button>
          <ConfirmDialogDeleteAll
            isOpen={showConfirmDeleteAll}
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
};

BulkActionsBar.propTypes = {
  showPublish: PropTypes.bool,
  showDelete: PropTypes.bool,
  onConfirmDeleteAll: PropTypes.func,
  selectedEntries: PropTypes.array.isRequired,
  clearSelectedEntries: PropTypes.func.isRequired,
};

export default BulkActionsBar;

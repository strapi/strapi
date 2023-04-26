import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import ConfirmDialogDeleteAll from '../ConfirmDialogDeleteAll';
import { useTracking } from '@strapi/helper-plugin';

const BulkActionsBar = ({
  showPublish,
  showDelete,
  onConfirmDeleteAll,
  selectedEntries,
  clearSelectedEntries,
}) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const [isConfirmButtonLoading, setIsConfirmButtonLoading] = useState(false);
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

  return (
    <>
      {showPublish && (
        <>
          <Button variant="tertiary">
            {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
          </Button>
          <Button variant="tertiary">
            {formatMessage({ id: 'app.utils.unpublish', defaultMessage: 'Unpublish' })}
          </Button>
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
  showPublishUnpublish: false,
  showDelete: false,
  onConfirmDeleteAll: () => {},
};

BulkActionsBar.propTypes = {
  showPublishUnpublish: PropTypes.bool,
  showDelete: PropTypes.bool,
  onConfirmDeleteAll: PropTypes.func,
  selectedEntries: PropTypes.array.isRequired,
  clearSelectedEntries: PropTypes.func.isRequired,
};

export default BulkActionsBar;

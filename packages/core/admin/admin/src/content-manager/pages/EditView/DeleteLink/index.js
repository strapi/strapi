import React, { memo, useState } from 'react';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import isEqual from 'react-fast-compare';
import { Button } from '@strapi/design-system/Button';
import Trash from '@strapi/icons/Trash';
import { ConfirmDialog, useNotification } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { getTrad } from '../../../utils';
import { connect, select } from './utils';

const DeleteLink = ({ isCreatingEntry, onDelete, onDeleteSucceeded, trackerProperty }) => {
  const [showWarningDelete, setWarningDelete] = useState(false);
  const [isModalConfirmButtonLoading, setIsModalConfirmButtonLoading] = useState(false);
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();

  const toggleWarningDelete = () => setWarningDelete(prevState => !prevState);

  const handleConfirmDelete = async () => {
    try {
      // Show the loading state
      setIsModalConfirmButtonLoading(true);

      await onDelete(trackerProperty);

      setIsModalConfirmButtonLoading(false);

      toggleWarningDelete();
      onDeleteSucceeded();
    } catch (err) {
      const errorMessage = get(
        err,
        'response.payload.message',
        formatMessage({ id: getTrad('error.record.delete') })
      );
      setIsModalConfirmButtonLoading(false);
      toggleWarningDelete();
      toggleNotification({ type: 'warning', message: errorMessage });
    }
  };

  if (isCreatingEntry) {
    return null;
  }

  return (
    <>
      <Button onClick={toggleWarningDelete} size="S" startIcon={<Trash />} variant="danger-light">
        {formatMessage({
          id: getTrad('containers.Edit.delete-entry'),
          defaultMessage: 'Delete this entry',
        })}
      </Button>
      <ConfirmDialog
        isConfirmButtonLoading={isModalConfirmButtonLoading}
        isOpen={showWarningDelete}
        onConfirm={handleConfirmDelete}
        onToggleDialog={toggleWarningDelete}
      />
    </>
  );
};

DeleteLink.propTypes = {
  isCreatingEntry: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDeleteSucceeded: PropTypes.func.isRequired,
  trackerProperty: PropTypes.object.isRequired,
};

const Memoized = memo(DeleteLink, isEqual);

export default connect(Memoized, select);

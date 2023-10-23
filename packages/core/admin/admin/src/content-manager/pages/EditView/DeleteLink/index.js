import React, { memo, useState } from 'react';

import { Button } from '@strapi/design-system';
import { ConfirmDialog, useAPIErrorHandler, useNotification } from '@strapi/helper-plugin';
import { Trash } from '@strapi/icons';
import isEqual from 'lodash/isEqual';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';

import { connect, select } from './utils';

const DeleteLink = ({ onDelete, trackerProperty }) => {
  const [displayDeleteConfirmation, setDisplayDeleteConfirmation] = useState(false);
  const [isModalConfirmButtonLoading, setIsModalConfirmButtonLoading] = useState(false);
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler(getTrad);
  const toggleNotification = useNotification();

  const toggleWarningDelete = () => setDisplayDeleteConfirmation((prevState) => !prevState);

  const handleConfirmDelete = async () => {
    try {
      // Show the loading state
      setIsModalConfirmButtonLoading(true);

      await onDelete(trackerProperty);

      setIsModalConfirmButtonLoading(false);

      toggleWarningDelete();
    } catch (err) {
      setIsModalConfirmButtonLoading(false);
      toggleWarningDelete();
      toggleNotification({
        type: 'warning',
        message: formatAPIError(err),
      });
    }
  };

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
        isOpen={displayDeleteConfirmation}
        onConfirm={handleConfirmDelete}
        onToggleDialog={toggleWarningDelete}
      />
    </>
  );
};

DeleteLink.propTypes = {
  onDelete: PropTypes.func.isRequired,
  trackerProperty: PropTypes.object.isRequired,
};

const Memoized = memo(DeleteLink, isEqual);

export default connect(Memoized, select);

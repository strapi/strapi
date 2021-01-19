import React, { memo, useState } from 'react';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import isEqual from 'react-fast-compare';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Text } from '@buffetjs/core';
import { PopUpWarning } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import pluginId from '../../../pluginId';
import { getTrad } from '../../../utils';
import { DeleteButton } from '../components';
import { connect, select } from './utils';

const DeleteLink = ({ isCreatingEntry, onDelete, onDeleteSucceeded, trackerProperty }) => {
  const [showWarningDelete, setWarningDelete] = useState(false);
  const [didDeleteEntry, setDidDeleteEntry] = useState(false);
  const [isModalConfirmButtonLoading, setIsModalConfirmButtonLoading] = useState(false);
  const { formatMessage } = useIntl();

  const toggleWarningDelete = () => setWarningDelete(prevState => !prevState);

  const handleConfirmDelete = async () => {
    try {
      // Show the loading state
      setIsModalConfirmButtonLoading(true);

      await onDelete(trackerProperty);

      // This is used to perform action after the modal is closed
      // so the transitions are smoother
      // Actions will be performed in the handleClosed function
      setDidDeleteEntry(true);
    } catch (err) {
      const errorMessage = get(
        err,
        'response.payload.message',
        formatMessage({ id: `${pluginId}.error.record.delete` })
      );
      strapi.notification.error(errorMessage);
    } finally {
      setIsModalConfirmButtonLoading(false);
      toggleWarningDelete();
    }
  };

  const handleClosed = () => {
    setDidDeleteEntry(false);

    if (didDeleteEntry) {
      onDeleteSucceeded();
    }
  };

  if (isCreatingEntry) {
    return null;
  }

  return (
    <>
      <li>
        <DeleteButton onClick={toggleWarningDelete}>
          <FontAwesomeIcon icon="trash-alt" />
          <Text lineHeight="22px" color="lightOrange">
            {formatMessage({
              id: getTrad('containers.Edit.delete-entry'),
            })}
          </Text>
        </DeleteButton>
      </li>
      <PopUpWarning
        isOpen={showWarningDelete}
        toggleModal={toggleWarningDelete}
        content={{
          message: getTrad('popUpWarning.bodyMessage.contentType.delete'),
        }}
        popUpWarningType="danger"
        onConfirm={handleConfirmDelete}
        onClosed={handleClosed}
        isConfirmButtonLoading={isModalConfirmButtonLoading}
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

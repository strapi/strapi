import React, { memo, useState } from 'react';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import isEqual from 'react-fast-compare';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { Text } from '@buffetjs/core';
import { PopUpWarning, request, useGlobalContext } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import pluginId from '../../../pluginId';
import { getTrad } from '../../../utils';
import { DeleteButton } from '../components';
import { connect, select } from './utils';

const getRequestUrl = path => `/${pluginId}/explorer/${path}`;

const DeleteLink = ({ canDelete, clearData, dataId, isCreatingEntry, isSingleType, slug }) => {
  const {
    params: { contentType },
  } = useRouteMatch('/plugins/content-manager/:contentType');
  const { push } = useHistory();

  const [showWarningDelete, setWarningDelete] = useState(false);
  const [didDeleteEntry, setDidDeleteEntry] = useState(false);
  const [isModalConfirmButtonLoading, setIsModalConfirmButtonLoading] = useState(false);
  const { formatMessage } = useIntl();
  const { emitEvent } = useGlobalContext();

  const toggleWarningDelete = () => setWarningDelete(prevState => !prevState);

  const handleConfirmDelete = async () => {
    try {
      // Show the loading state
      setIsModalConfirmButtonLoading(true);

      emitEvent('willDeleteEntry');

      await request(getRequestUrl(`${slug}/${dataId}`), {
        method: 'DELETE',
      });

      strapi.notification.success(`${pluginId}.success.record.delete`);

      emitEvent('didDeleteEntry');

      // This is used to perform action after the modal is closed
      // so the transitions are smoother
      // Actions will be performed in the handleClosed function
      setDidDeleteEntry(true);
    } catch (err) {
      emitEvent('didNotDeleteEntry', { error: err });
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
      if (!isSingleType) {
        push(`/plugins/${pluginId}/${contentType}/${slug}`);
      } else {
        clearData();
      }
    }
  };

  if (isCreatingEntry || !canDelete) {
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
          title: `${pluginId}.popUpWarning.title`,
          message: `${pluginId}.popUpWarning.bodyMessage.contentType.delete`,
        }}
        popUpWarningType="danger"
        onConfirm={handleConfirmDelete}
        onClosed={handleClosed}
        isConfirmButtonLoading={isModalConfirmButtonLoading}
      />
    </>
  );
};

DeleteLink.defaultProps = {
  dataId: null,
};

DeleteLink.propTypes = {
  canDelete: PropTypes.bool.isRequired,
  clearData: PropTypes.func.isRequired,
  dataId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isCreatingEntry: PropTypes.bool.isRequired,
  isSingleType: PropTypes.bool.isRequired,
  slug: PropTypes.string.isRequired,
};

const Memoized = memo(DeleteLink, isEqual);

export default connect(Memoized, select);

import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { Text } from '@buffetjs/core';

import { PopUpWarning, request, useGlobalContext } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import useEditView from '../../hooks/useEditView';
import { DeleteButton } from './components';

const getRequestUrl = path => `/${pluginId}/explorer/${path}`;

const DeleteLink = () => {
  const {
    initialData,
    isCreatingEntry,
    isSingleType,
    redirectToPreviousPage,
    slug,
    clearData,
  } = useDataManager();
  const {
    allowedActions: { canDelete },
  } = useEditView();
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

      await request(getRequestUrl(`${slug}/${initialData.id}`), {
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
      push(`/plugins/${pluginId}/${contentType}/${slug}`);
    }
  };

  const handleClosed = () => {
    if (didDeleteEntry) {
      if (!isSingleType) {
        redirectToPreviousPage();
      } else {
        clearData();
      }
    }

    setDidDeleteEntry(false);
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
              id: 'app.utils.delete-entry',
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
          cancel: `${pluginId}.popUpWarning.button.cancel`,
          confirm: `${pluginId}.popUpWarning.button.confirm`,
        }}
        popUpWarningType="danger"
        onConfirm={handleConfirmDelete}
        onClosed={handleClosed}
        isConfirmButtonLoading={isModalConfirmButtonLoading}
      />
    </>
  );
};

export default DeleteLink;

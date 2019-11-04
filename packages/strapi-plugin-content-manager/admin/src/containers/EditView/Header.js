import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  PluginHeader,
  PopUpWarning,
  request,
  templateObject,
} from 'strapi-helper-plugin';
import { get } from 'lodash';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';

const getRequestUrl = path => `/${pluginId}/explorer/${path}`;

const Header = () => {
  const [showWarningCancel, setWarningCancel] = useState(false);
  const [showWarningDelete, setWarningDelete] = useState(false);

  const { id } = useParams();
  const {
    initialData,
    layout,
    redirectToPreviousPage,
    resetData,
    setIsSubmitting,
    shouldShowLoadingState,
    slug,
    source,
  } = useDataManager();

  const currentContentTypeMainField = get(
    layout,
    ['settings', 'mainField'],
    'id'
  );
  const isCreatingEntry = id === 'create';
  const pluginHeaderTitle = isCreatingEntry
    ? { id: `${pluginId}.containers.Edit.pluginHeader.title.new` }
    : templateObject({ mainField: currentContentTypeMainField }, initialData)
        .mainField;

  const toggleWarningCancel = () => setWarningCancel(prevState => !prevState);
  const toggleWarningDelete = () => setWarningDelete(prevState => !prevState);

  const handleConfirmReset = () => {
    toggleWarningCancel();
    resetData();
  };
  const handleConfirmDelete = async () => {
    toggleWarningDelete();
    setIsSubmitting();

    try {
      await request(getRequestUrl(`${slug}/${id}`), {
        method: 'DELETE',
        params: { source },
      });

      strapi.notification.success(`${pluginId}.success.record.delete`);
      redirectToPreviousPage();
    } catch (err) {
      setIsSubmitting(false);
      strapi.notification.error(`${pluginId}.error.record.delete`);
    }
  };

  return (
    <>
      <PluginHeader
        actions={[
          {
            label: `${pluginId}.containers.Edit.reset`,
            kind: 'secondary',
            onClick: () => {
              toggleWarningCancel();
            },
            type: 'button',
            disabled: shouldShowLoadingState,
          },
          {
            kind: 'primary',
            label: `${pluginId}.containers.Edit.submit`,
            type: 'submit',
            loader: shouldShowLoadingState,
            style: shouldShowLoadingState ? { marginRight: '18px' } : {},
            disabled: shouldShowLoadingState,
          },
        ]}
        subActions={
          isCreatingEntry
            ? []
            : [
                {
                  label: 'app.utils.delete',
                  kind: 'delete',
                  onClick: () => {
                    toggleWarningDelete();
                  },
                  type: 'button',
                  disabled: shouldShowLoadingState,
                },
              ]
        }
        title={pluginHeaderTitle}
      />
      <PopUpWarning
        isOpen={showWarningCancel}
        toggleModal={toggleWarningCancel}
        content={{
          title: `${pluginId}.popUpWarning.title`,
          message: `${pluginId}.popUpWarning.warning.cancelAllSettings`,
          cancel: `${pluginId}.popUpWarning.button.cancel`,
          confirm: `${pluginId}.popUpWarning.button.confirm`,
        }}
        popUpWarningType="danger"
        onConfirm={handleConfirmReset}
      />
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
      />
    </>
  );
};

export default Header;

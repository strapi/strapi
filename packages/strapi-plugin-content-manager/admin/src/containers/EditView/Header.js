import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  PluginHeader,
  PopUpWarning,
  templateObject,
} from 'strapi-helper-plugin';
import { get } from 'lodash';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';

const Header = () => {
  const [showWarningCancel, setWarningCancel] = useState(false);
  const [showWarningDelete, setWarningDelete] = useState(false);

  const { id } = useParams();
  const { initialData, layout } = useDataManager();

  const currentContentTypeMainField = get(
    layout,
    ['contentType', 'settings', 'mainField'],
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
    console.log('WILL RESET DATA');
    toggleWarningCancel();
  };
  const handleConfirmDelete = async () => {
    console.log('WILL DELETE ENTRY');
    toggleWarningDelete();
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
            // disabled: isSubmitting, // TODO STATE WHEN SUBMITING
          },
          {
            kind: 'primary',
            label: `${pluginId}.containers.Edit.submit`,
            type: 'submit',
            // loader: isSubmitting,
            // style: isSubmitting ? { marginRight: '18px' } : {},
            // disabled: isSubmitting, // TODO STATE WHEN SUBMITING
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
                  // disabled: isSubmitting, // TODO STATE WHEN SUBMITING
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

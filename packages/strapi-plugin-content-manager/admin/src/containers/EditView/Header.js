import React, { useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Header as PluginHeader } from '@buffetjs/custom';
import { get, isEqual, isEmpty, toString } from 'lodash';

import { PopUpWarning, templateObject } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import useEditView from '../../hooks/useEditView';

const Header = () => {
  const [showWarningCancel, setWarningCancel] = useState(false);
  const { formatMessage } = useIntl();
  const formatMessageRef = useRef(formatMessage);
  const {
    initialData,
    isCreatingEntry,
    isSingleType,
    isSubmitting,
    isPublishing,
    layout,
    modifiedData,
    onPublish,
    resetData,
  } = useDataManager();
  const {
    allowedActions: { canDelete, canUpdate, canCreate, canPublish },
  } = useEditView();

  const currentContentTypeMainField = useMemo(() => get(layout, ['settings', 'mainField'], 'id'), [
    layout,
  ]);
  const currentContentTypeName = useMemo(() => get(layout, ['schema', 'info', 'name']), [layout]);
  const hasDraftAndPublish = useMemo(() => get(layout, ['schema', 'options', 'draftAndPublish']), [
    layout,
  ]);
  const didChangeData = useMemo(() => {
    return !isEqual(initialData, modifiedData) || (isCreatingEntry && !isEmpty(modifiedData));
  }, [initialData, isCreatingEntry, modifiedData]);
  const apiID = useMemo(() => layout.apiID, [layout.apiID]);

  /* eslint-disable indent */
  const entryHeaderTitle = isCreatingEntry
    ? formatMessage({
        id: `${pluginId}.containers.Edit.pluginHeader.title.new`,
      })
    : templateObject({ mainField: currentContentTypeMainField }, initialData).mainField;
  /* eslint-enable indent */

  const headerTitle = useMemo(() => {
    const title = isSingleType ? currentContentTypeName : entryHeaderTitle;

    return title || currentContentTypeName;
  }, [currentContentTypeName, entryHeaderTitle, isSingleType]);

  const headerActions = useMemo(() => {
    let headerActions = [];

    if ((isCreatingEntry && canCreate) || (!isCreatingEntry && canUpdate)) {
      headerActions = [
        {
          disabled: !didChangeData,
          color: 'success',
          label: formatMessage({
            id: `${pluginId}.containers.Edit.submit`,
          }),
          isLoading: isSubmitting,
          type: 'submit',
          style: {
            minWidth: 150,
            fontWeight: 600,
          },
        },
      ];
    }

    if (hasDraftAndPublish && canPublish) {
      headerActions.unshift({
        disabled: didChangeData,
        label: formatMessage({
          id: 'app.utils.publish',
        }),
        color: 'primary',
        onClick: onPublish,
        type: 'button',
        isLoading: isPublishing,
        style: {
          minWidth: 150,
          fontWeight: 600,
        },
      });
    }

    return headerActions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isCreatingEntry,
    canCreate,
    canUpdate,
    hasDraftAndPublish,
    canPublish,
    canDelete,
    didChangeData,
    formatMessage,
    isSubmitting,
    isPublishing,
  ]);

  const headerProps = useMemo(() => {
    return {
      title: {
        label: toString(headerTitle),
      },
      content: `${formatMessageRef.current({ id: `${pluginId}.api.id` })} : ${apiID}`,
      actions: headerActions,
    };
  }, [headerActions, headerTitle, apiID]);

  const toggleWarningCancel = () => setWarningCancel(prevState => !prevState);

  const handleConfirmReset = () => {
    toggleWarningCancel();
    resetData();
  };

  return (
    <>
      <PluginHeader {...headerProps} />
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
    </>
  );
};

export default Header;

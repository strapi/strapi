import React, { useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Header as PluginHeader } from '@buffetjs/custom';
import { get, isEqual, isEmpty, toString } from 'lodash';

import { PopUpWarning, templateObject } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import useEditView from '../../hooks/useEditView';

const primaryButtonObject = {
  color: 'primary',
  type: 'button',
  style: {
    minWidth: 150,
    fontWeight: 600,
  },
};

const Header = () => {
  const [showWarningUnpublish, setWarningUnpublish] = useState(false);
  const { formatMessage } = useIntl();
  const formatMessageRef = useRef(formatMessage);
  const {
    initialData,
    isCreatingEntry,
    isSingleType,
    status,
    layout,
    hasDraftAndPublish,
    modifiedData,
    onPublish,
    onUnpublish,
  } = useDataManager();

  const {
    allowedActions: { canUpdate, canCreate, canPublish },
  } = useEditView();

  const currentContentTypeMainField = useMemo(() => get(layout, ['settings', 'mainField'], 'id'), [
    layout,
  ]);
  const currentContentTypeName = useMemo(() => get(layout, ['schema', 'info', 'name']), [layout]);

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
          isLoading: status === 'submit-pending',
          type: 'submit',
          style: {
            minWidth: 150,
            fontWeight: 600,
          },
        },
      ];
    }

    if (hasDraftAndPublish && canPublish) {
      const isPublished = !isEmpty(initialData.published_at);
      const isLoading = isPublished ? status === 'unpublish-pending' : status === 'publish-pending';
      const labelID = isPublished ? 'app.utils.unpublish' : 'app.utils.publish';
      const onClick = isPublished ? () => setWarningUnpublish(true) : onPublish;

      const action = {
        ...primaryButtonObject,
        disabled: isCreatingEntry || didChangeData,
        isLoading,
        label: formatMessage({ id: labelID }),
        onClick,
      };

      headerActions.unshift(action);
    }

    return headerActions;
  }, [
    isCreatingEntry,
    canCreate,
    canUpdate,
    hasDraftAndPublish,
    canPublish,
    didChangeData,
    formatMessage,
    status,
    initialData,
    onPublish,
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

  const toggleWarningPublish = () => setWarningUnpublish(prevState => !prevState);

  const handleConfirmUnpublish = e => {
    onUnpublish(e);
    setWarningUnpublish(false);
  };

  return (
    <>
      <PluginHeader {...headerProps} />
      <PopUpWarning
        isOpen={showWarningUnpublish}
        toggleModal={toggleWarningPublish}
        content={{
          title: `${pluginId}.popUpWarning.title`,
          message: `${pluginId}.popUpWarning.warning.unpublish`,
          secondMessage: `${pluginId}.popUpWarning.warning.unpublish-question`,
          cancel: `${pluginId}.popUpWarning.button.cancel`,
          confirm: `${pluginId}.popUpWarning.button.confirm`,
        }}
        popUpWarningType="danger"
        onConfirm={handleConfirmUnpublish}
      />
    </>
  );
};

export default Header;

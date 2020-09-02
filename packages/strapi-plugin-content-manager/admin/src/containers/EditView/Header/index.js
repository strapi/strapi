import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Header as PluginHeader } from '@buffetjs/custom';
import { get, isEqual, isEmpty, toString } from 'lodash';
import PropTypes from 'prop-types';
import isEqualFastCompare from 'react-fast-compare';
import { PopUpWarning, templateObject } from 'strapi-helper-plugin';
import pluginId from '../../../pluginId';
import { getTrad } from '../../../utils';
import { connect, getDraftRelations, select } from './utils';

const primaryButtonObject = {
  color: 'primary',
  type: 'button',
  style: {
    minWidth: 150,
    fontWeight: 600,
  },
};

const Header = ({
  canUpdate,
  canCreate,
  canPublish,
  componentLayouts,
  initialData,
  isCreatingEntry,
  isSingleType,
  status,
  layout,
  hasDraftAndPublish,
  modifiedData,
  onPublish,
  onUnpublish,
}) => {
  const [showWarningUnpublish, setWarningUnpublish] = useState(false);
  const { formatMessage } = useIntl();
  const formatMessageRef = useRef(formatMessage);
  const [draftRelationsCount, setDraftRelationsCount] = useState(0);
  const [showWarningDraftRelation, setShowWarningDraftRelation] = useState(false);
  const [shouldUnpublish, setShouldUnpublish] = useState(false);
  const [shouldPublish, setShouldPublish] = useState(false);

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

  const checkIfHasDraftRelations = useCallback(() => {
    const count = getDraftRelations(modifiedData, layout, componentLayouts);

    setDraftRelationsCount(count);

    return count > 0;
  }, [modifiedData, layout, componentLayouts]);

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
      const onClick = isPublished
        ? () => setWarningUnpublish(true)
        : e => {
          if (!checkIfHasDraftRelations()) {
            onPublish(e);
          } else {
            setShowWarningDraftRelation(true);
          }
        };

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
    checkIfHasDraftRelations,
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

  const toggleWarningDraftRelation = useCallback(() => {
    setShowWarningDraftRelation(prev => !prev);
  }, []);

  const handleConfirmPublish = useCallback(() => {
    setShouldPublish(true);
    setShowWarningDraftRelation(false);
  }, []);

  const handleConfirmUnpublish = useCallback(() => {
    setShouldUnpublish(true);
    setWarningUnpublish(false);
  }, []);

  const handleCloseModalPublish = useCallback(
    e => {
      if (shouldPublish) {
        onPublish(e);
      }

      setShouldUnpublish(false);
    },
    [onPublish, shouldPublish]
  );
  const handleCloseModalUnpublish = useCallback(
    e => {
      if (shouldUnpublish) {
        onUnpublish(e);
      }

      setShouldUnpublish(false);
    },
    [onUnpublish, shouldUnpublish]
  );

  const boldText = formatMessage(
    { id: getTrad('popUpwarning.warning.has-draft-relations.message.bold-text') },
    { count: draftRelationsCount }
  );

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
        onClosed={handleCloseModalUnpublish}
      />
      <PopUpWarning
        isOpen={showWarningDraftRelation}
        toggleModal={toggleWarningDraftRelation}
        content={{
          title: getTrad('popUpWarning.title'),
          message: getTrad('popUpwarning.warning.has-draft-relations.message'),
          messageValues: { boldText: <b>{boldText}</b> },
          secondMessage: getTrad('popUpWarning.warning.publish-question'),
          cancel: getTrad('popUpWarning.button.cancel'),
          confirm: getTrad('popUpWarning.button.confirm'),
        }}
        popUpWarningType="danger"
        onConfirm={handleConfirmPublish}
        onClosed={handleCloseModalPublish}
      />
    </>
  );
};

Header.propTypes = {
  canUpdate: PropTypes.bool.isRequired,
  canCreate: PropTypes.bool.isRequired,
  canPublish: PropTypes.bool.isRequired,
  componentLayouts: PropTypes.object.isRequired,
  initialData: PropTypes.object.isRequired,
  isCreatingEntry: PropTypes.bool.isRequired,
  isSingleType: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
  hasDraftAndPublish: PropTypes.bool.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onPublish: PropTypes.func.isRequired,
  onUnpublish: PropTypes.func.isRequired,
};

const Memoized = memo(Header, isEqualFastCompare);

export default connect(Memoized, select);

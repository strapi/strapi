import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Header as PluginHeader } from '@buffetjs/custom';
import { get, isEqual, isEmpty, toString } from 'lodash';
import PropTypes from 'prop-types';
import isEqualFastCompare from 'react-fast-compare';
import { Text } from '@buffetjs/core';
import { templateObject, ModalConfirm } from 'strapi-helper-plugin';
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
  allowedActions: { canUpdate, canCreate, canPublish },
  componentLayouts,
  initialData,
  isCreatingEntry,
  isSingleType,
  hasDraftAndPublish,
  layout,
  modifiedData,
  onPublish,
  onUnpublish,
  status,
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

  const currentContentTypeName = useMemo(() => get(layout, ['info', 'name']), [layout]);

  const didChangeData = useMemo(() => {
    return !isEqual(initialData, modifiedData) || (isCreatingEntry && !isEmpty(modifiedData));
  }, [initialData, isCreatingEntry, modifiedData]);
  const apiID = useMemo(() => layout.apiID, [layout.apiID]);

  /* eslint-disable indent */
  const entryHeaderTitle = isCreatingEntry
    ? formatMessage({
        id: getTrad('containers.Edit.pluginHeader.title.new'),
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
            id: getTrad('containers.Edit.submit'),
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
      /* eslint-disable indent */
      const onClick = isPublished
        ? () => setWarningUnpublish(true)
        : e => {
            if (!checkIfHasDraftRelations()) {
              onPublish(e);
            } else {
              setShowWarningDraftRelation(true);
            }
          };
      /* eslint-enable indent */

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
      content: `${formatMessageRef.current({ id: getTrad('api.id') })} : ${apiID}`,
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

  const contentIdSuffix = draftRelationsCount > 1 ? 'plural' : 'singular';

  return (
    <>
      <PluginHeader {...headerProps} />
      {hasDraftAndPublish && (
        <>
          <ModalConfirm
            isOpen={showWarningUnpublish}
            toggle={toggleWarningPublish}
            content={{
              id: getTrad('popUpWarning.warning.unpublish'),
              values: {
                br: () => <br />,
              },
            }}
            type="xwarning"
            onConfirm={handleConfirmUnpublish}
            onClosed={handleCloseModalUnpublish}
          >
            <Text>{formatMessage({ id: getTrad('popUpWarning.warning.unpublish-question') })}</Text>
          </ModalConfirm>
          <ModalConfirm
            confirmButtonLabel={{
              id: getTrad('popUpwarning.warning.has-draft-relations.button-confirm'),
            }}
            isOpen={showWarningDraftRelation}
            toggle={toggleWarningDraftRelation}
            onClosed={handleCloseModalPublish}
            onConfirm={handleConfirmPublish}
            type="success"
            content={{
              id: getTrad(`popUpwarning.warning.has-draft-relations.message.${contentIdSuffix}`),
              values: {
                count: draftRelationsCount,
                b: chunks => (
                  <Text as="span" fontWeight="bold">
                    {chunks}
                  </Text>
                ),
                br: () => <br />,
              },
            }}
          >
            <Text>{formatMessage({ id: getTrad('popUpWarning.warning.publish-question') })}</Text>
          </ModalConfirm>
        </>
      )}
    </>
  );
};

Header.propTypes = {
  allowedActions: PropTypes.shape({
    canUpdate: PropTypes.bool.isRequired,
    canCreate: PropTypes.bool.isRequired,
    canPublish: PropTypes.bool.isRequired,
  }).isRequired,
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

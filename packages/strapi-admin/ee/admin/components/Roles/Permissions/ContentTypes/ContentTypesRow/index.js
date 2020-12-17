import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Checkbox, Flex, Text, Padded } from '@buffetjs/core';

// TODO : This is why we need the babel module resolver plugin.
import { getAttributesToDisplay } from '../../../../../../../admin/src/utils';
import { usePermissionsContext } from '../../../../../../../admin/src/hooks';
import {
  ATTRIBUTES_PERMISSIONS_ACTIONS,
  isAttributeAction,
  getAttributePermissionsSizeByContentTypeAction,
  getAllAttributesActions,
  getAttributesByModel,
} from '../../../../../../../admin/src/components/Roles/Permissions/utils';
import Chevron from '../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/Chevron';
import PermissionCheckbox from '../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/PermissionCheckbox';
import PermissionName from '../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/PermissionName';
import StyledRow from '../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/StyledRow';
import ContentTypesAttributes from '../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ContentTypesAttributes';
import PermissionWrapper from '../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/PermissionWrapper';
import CollapseLabel from '../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/CollapseLabel';
import ConditionsButton from '../../../../../../../admin/src/components/Roles/ConditionsButton';
import RowWrapper from '../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/RowWrapper';
import ConditionsModal from '../../../../../../../admin/src/components/Roles/ConditionsModal';

const ContentTypeRow = ({ index, contentType, permissionsLayout }) => {
  const [modal, setModal] = useState({ isOpen: false, isMounted: false });
  const {
    collapsePath,
    dispatch,
    contentTypesPermissions,
    components,
    isSuperAdmin,
  } = usePermissionsContext();
  const isActive = collapsePath[0] === contentType.uid;

  const contentTypeActions = useMemo(() => {
    const contentTypesActionObject = get(
      contentTypesPermissions,
      [contentType.uid, 'contentTypeActions'],
      {}
    );

    return Object.keys(contentTypesActionObject).filter(
      action => !!contentTypesActionObject[action] && !isAttributeAction(action)
    );
  }, [contentType, contentTypesPermissions]);

  const conditions = useMemo(() => {
    return get(contentTypesPermissions, [contentType.uid, 'conditions'], {});
  }, [contentType, contentTypesPermissions]);

  const actionsForConditions = useMemo(() => {
    const existingActions = getAllAttributesActions(contentType.uid, contentTypesPermissions);

    return Array.from(new Set([...contentTypeActions, ...existingActions])).map(action => ({
      id: action,
      displayName: action.split('.')[action.split('.').length - 1],
    }));
  }, [contentTypeActions, contentTypesPermissions, contentType]);

  // Number of all actions in the current content type.
  const allCurrentActionsSize = useMemo(() => {
    return (
      getAllAttributesActions(contentType.uid, contentTypesPermissions).length +
      contentTypeActions.length
    );
  }, [contentType, contentTypeActions.length, contentTypesPermissions]);

  // Attributes to display : Liste of attributes of in the content type without timestamps and id
  // Used to display the first level of attributes.
  const attributesToDisplay = useMemo(() => {
    return getAttributesToDisplay(contentType);
  }, [contentType]);

  // All recursive attributes.
  // Used to recursively set the global content type action
  const attributes = useMemo(() => {
    return getAttributesByModel(contentType, components);
  }, [contentType, components]);

  const contentTypesActions = useMemo(() => {
    return permissionsLayout.filter(
      layout => layout.subjects.includes(contentType.uid) && !isAttributeAction(layout.action)
    );
  }, [contentType, permissionsLayout]);

  const allActionsSize = useMemo(() => {
    return attributes.length * ATTRIBUTES_PERMISSIONS_ACTIONS.length + contentTypesActions.length;
  }, [attributes, contentTypesActions]);

  const hasContentTypeAction = useCallback(
    action =>
      get(contentTypesPermissions, [contentType.uid, 'contentTypeActions', action], false) &&
      !isAttributeAction(action),
    [contentTypesPermissions, contentType]
  );

  const getAttributesPermissions = useCallback(
    action => {
      return getAttributePermissionsSizeByContentTypeAction(
        contentTypesPermissions,
        contentType.uid,
        action
      );
    },
    [contentType, contentTypesPermissions]
  );

  const hasAllAttributeByAction = useCallback(
    action => {
      const attributesPermissionsCount = getAttributesPermissions(action);

      return attributesPermissionsCount === attributes.length;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentTypesPermissions, contentType, attributes]
  );

  // Check if an attribute have the passed action
  // Used to set the someChecked props of an action checkbox
  const hasSomeAttributeByAction = useCallback(
    action => {
      const attributesPermissionsCount = getAttributesPermissions(action);

      return attributesPermissionsCount > 0 && attributesPermissionsCount < attributes.length;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentTypesPermissions, contentType, attributes]
  );

  const checkConditions = useCallback(
    action => {
      return get(conditions, [action], []).length > 0;
    },
    [conditions]
  );

  const subjectHasConditions = useMemo(() => {
    return Object.values(conditions).flat().length > 0;
  }, [conditions]);

  const handleToggleAttributes = () => {
    dispatch({
      type: 'COLLAPSE_PATH',
      index: 0,
      value: contentType.uid,
    });
  };

  const handleActionSelect = action => {
    dispatch({
      type: 'SELECT_MULTIPLE_ATTRIBUTE',
      subject: contentType.uid,
      shouldEnable: !hasAllAttributeByAction(action),
      attributes,
      action,
    });
  };

  const handleContentTypeActionSelect = action => {
    dispatch({
      type: 'CONTENT_TYPE_ACTION_SELECT',
      subject: contentType.uid,
      action,
    });
  };

  // Check/Uncheck all the actions for all
  // attributes of the current content type
  const handleAllContentTypeActions = () => {
    dispatch({
      type: 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT',
      subject: contentType.uid,
      attributes: getAttributesByModel(contentType, components),
      shouldEnable: allCurrentActionsSize < allActionsSize,
      shouldSetAllContentTypes: true,
    });
  };

  const handleModalOpen = () => {
    setModal({
      isMounted: true,
      isOpen: true,
    });
  };

  const handleToggleModal = () => {
    setModal(prev => ({
      ...prev,
      isOpen: !prev.isOpen,
    }));
  };

  const handleClosed = () => {
    setModal(prev => ({ ...prev, isMounted: false }));
  };

  const handleModalSubmit = conditions => {
    dispatch({
      type: 'ON_CONTENT_TYPE_CONDITIONS_SELECT',
      subject: contentType.uid,
      conditions,
    });
  };

  const permissionsToDisplay = useMemo(() => {
    return permissionsLayout.filter(permission => permission.subjects.includes(contentType.uid));
  }, [contentType, permissionsLayout]);

  return (
    <RowWrapper withMargin={index % 2 !== 0}>
      <StyledRow disabled={isSuperAdmin} isActive={isActive} isGrey={index % 2 === 0}>
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <PermissionName disabled={isSuperAdmin}>
            <Checkbox
              onChange={handleAllContentTypeActions}
              name={contentType.info.name}
              disabled={isSuperAdmin}
              someChecked={allCurrentActionsSize > 0 && allCurrentActionsSize < allActionsSize}
              value={allCurrentActionsSize === allActionsSize}
            />
            <CollapseLabel
              title={contentType.info.name}
              alignItems="center"
              isCollapsable
              onClick={handleToggleAttributes}
            >
              <Text
                color="grey"
                ellipsis
                fontSize="xs"
                fontWeight="bold"
                lineHeight="20px"
                textTransform="uppercase"
              >
                {contentType.info.name}
              </Text>
              <Chevron icon={isActive ? 'chevron-up' : 'chevron-down'} />
            </CollapseLabel>
          </PermissionName>
          <PermissionWrapper disabled={isSuperAdmin}>
            {permissionsToDisplay.map(({ action }) => {
              /* eslint-disable */
              const checkboxProps = isAttributeAction(action)
                ? {
                    someChecked: hasSomeAttributeByAction(action),
                    onChange: () => handleActionSelect(action),
                  }
                : {
                    someChecked: null,
                    onChange: () => handleContentTypeActionSelect(action),
                  };
              /* eslint-enable */

              return (
                <PermissionCheckbox
                  key={`${contentType.info.name}-${action}`}
                  hasConditions={checkConditions(action)}
                  disabled={isSuperAdmin}
                  value={hasAllAttributeByAction(action) || hasContentTypeAction(action)}
                  name={`${contentType.info.name}-${action}`}
                  onChange={() => handleContentTypeActionSelect(action)}
                  {...checkboxProps}
                />
              );
            })}
          </PermissionWrapper>
          <ConditionsButton
            isRight
            hasConditions={subjectHasConditions}
            onClick={handleModalOpen}
          />
        </Flex>
      </StyledRow>
      {isActive && (
        <ContentTypesAttributes
          withPadding={index % 2 !== 0}
          contentType={contentType}
          attributes={attributesToDisplay}
        />
      )}
      {modal.isMounted && (
        <ConditionsModal
          actions={actionsForConditions}
          initialConditions={conditions}
          onToggle={handleToggleModal}
          onSubmit={handleModalSubmit}
          isOpen={modal.isOpen}
          onClosed={handleClosed}
          headerBreadCrumbs={[
            contentType.info.name,
            'app.components.LeftMenuLinkContainer.settings',
          ]}
        />
      )}
    </RowWrapper>
  );
};

ContentTypeRow.propTypes = {
  contentType: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  permissionsLayout: PropTypes.array.isRequired,
};

export default ContentTypeRow;

import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Checkbox, Flex, Text, Padded } from '@buffetjs/core';

import { getAttributesToDisplay } from '../../../../../utils';
import { usePermissionsContext } from '../../../../../hooks';
import ConditionsButton from '../../../ConditionsButton';
import ConditionsModal from '../../../ConditionsModal';
import {
  getAllAttributesActions,
  getAttributePermissionsSizeByContentTypeAction,
  getAttributesByModel,
  isAttributeAction,
  STATIC_ATTRIBUTE_ACTIONS,
} from '../../utils';
import Chevron from './Chevron';
import CollapseLabel from '../CollapseLabel';
import ContentTypesAttributes from './ContentTypesAttributes';
import PermissionCheckbox from '../PermissionCheckbox';
import PermissionName from './PermissionName';
import PermissionWrapper from './PermissionWrapper';
import RowWrapper from './RowWrapper';
import StyledRow from './StyledRow';

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
  const existingActions = useMemo(
    () => getAllAttributesActions(contentType.uid, contentTypesPermissions),
    [contentType.uid, contentTypesPermissions]
  );

  const contentTypeActions = useMemo(() => {
    const contentTypesActionObject = get(
      contentTypesPermissions,
      [contentType.uid, 'contentTypeActions'],
      {}
    );

    return Object.keys(contentTypesActionObject).filter(
      action => !!contentTypesActionObject[action]
    );
  }, [contentType, contentTypesPermissions]);

  const conditions = useMemo(() => {
    return get(contentTypesPermissions, [contentType.uid, 'conditions'], {});
  }, [contentType, contentTypesPermissions]);

  const actionsForConditions = useMemo(() => {
    return Array.from(new Set([...contentTypeActions, ...existingActions])).map(action => ({
      id: action,
      displayName: action.split('.')[action.split('.').length - 1],
    }));
  }, [contentTypeActions, existingActions]);

  // Number of all actions in the current content type.
  const allCurrentActionsSize = useMemo(() => {
    return existingActions.length + contentTypeActions.length;
  }, [contentTypeActions.length, existingActions.length]);

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

  const contentTypesActions = useMemo(
    () => permissionsLayout.filter(layout => layout.subjects.includes(contentType.uid)),
    [contentType, permissionsLayout]
  );

  const allActionsSize = useMemo(() => {
    const staticContentTypeActions = contentTypesActions.filter(
      permission => !isAttributeAction(permission.action)
    );

    return attributes.length * STATIC_ATTRIBUTE_ACTIONS.length + staticContentTypeActions.length;
  }, [attributes, contentTypesActions]);

  const hasContentTypeAction = useCallback(
    action => get(contentTypesPermissions, [contentType.uid, 'contentTypeActions', action], false),
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

  // Check if an attribute have the passed action
  // Used to set the someChecked props of an action checkbox
  const hasSomeAttributeByAction = useCallback(
    action => {
      const attributesPermissionsCount = getAttributesPermissions(action);

      return attributesPermissionsCount > 0 && attributesPermissionsCount < attributes.length;
    },
    [attributes, getAttributesPermissions]
  );

  const hasAllAttributeAction = useCallback(
    action => {
      const attributesPermissionsCount = getAttributesPermissions(action);

      return attributesPermissionsCount === attributes.length;
    },
    [attributes.length, getAttributesPermissions]
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

  // Check/Uncheck all the actions for all
  // attributes of the current content type
  const handleAllContentTypeActions = ({ target }) => {
    dispatch({
      type: 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT',
      subject: contentType.uid,
      attributes: getAttributesByModel(contentType, components),
      shouldEnable: target.value,
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

  const someChecked = useMemo(() => {
    return allCurrentActionsSize > 0 && allCurrentActionsSize < allActionsSize;
  }, [allActionsSize, allCurrentActionsSize]);

  return (
    <RowWrapper withMargin={index % 2 !== 0}>
      <StyledRow disabled={isSuperAdmin} isActive={isActive} isGrey={index % 2 === 0}>
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <PermissionName disabled>
            <Checkbox
              onChange={handleAllContentTypeActions}
              name={contentType.info.name}
              disabled={isSuperAdmin}
              someChecked={someChecked}
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
          <PermissionWrapper disabled>
            {permissionsToDisplay.map(permissionLayout => {
              const { action } = permissionLayout;
              const someChecked = isAttributeAction(action)
                ? hasSomeAttributeByAction(action)
                : null;
              const value = isAttributeAction(action)
                ? hasAllAttributeAction(action)
                : hasContentTypeAction(action);

              return (
                <PermissionCheckbox
                  key={action}
                  hasConditions={checkConditions(action)}
                  disabled
                  value={value}
                  name={`${contentType.info.name}-${action}`}
                  someChecked={someChecked}
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

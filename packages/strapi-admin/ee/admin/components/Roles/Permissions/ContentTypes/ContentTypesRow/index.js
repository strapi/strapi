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
  getAllAttributesActionsSize,
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
    onCollapse,
    contentTypesPermissions,
    components,
    onContentTypeActionSelect,
    onAttributesSelect,
    onAllContentTypeActions,
    isSuperAdmin,
    onContentTypeConditionsSelect,
  } = usePermissionsContext();
  const isActive = collapsePath[0] === contentType.uid;

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
    return contentTypeActions.map(action => ({
      id: action,
      displayName: action.split('.')[action.split('.').length - 1],
    }));
  }, [contentTypeActions]);

  // Number of all actions in the current content type.
  const allCurrentActionsSize = useMemo(() => {
    return (
      getAllAttributesActionsSize(contentType.uid, contentTypesPermissions) +
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

  const allActionsSize = useMemo(() => {
    return attributes.length * ATTRIBUTES_PERMISSIONS_ACTIONS.length + permissionsLayout.length;
  }, [attributes, permissionsLayout]);

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

  const hasAllAttributeByAction = useCallback(
    action => {
      const attributesPermissionsCount = getAttributesPermissions(action);

      return attributesPermissionsCount > 0 && attributesPermissionsCount === attributes.length;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentTypesPermissions, contentType, attributes]
  );

  // Check if an attribute have the passed action
  // Used to set the someChecked props of an action checkbox
  const hasSomeAttributeByAction = useCallback(
    action => {
      const attributesPermissionsCount = getAttributesPermissions(action);

      return (
        attributesPermissionsCount > 0 &&
        attributesPermissionsCount < attributes.length &&
        hasContentTypeAction(action)
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attributes, hasContentTypeAction]
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
    onCollapse(0, contentType.uid);
  };

  const handleActionSelect = action => {
    onAttributesSelect({
      action,
      subject: contentType.uid,
      attributes,
      shouldEnable: !hasAllAttributeByAction(action) || !hasContentTypeAction(action),
      hasContentTypeAction: true,
    });
  };

  const handleContentTypeActionSelect = action => {
    onContentTypeActionSelect({
      action,
      subject: contentType.uid,
    });
  };

  // Check/Uncheck all the actions for all
  // attributes of the current content type
  const handleAllContentTypeActions = () => {
    onAllContentTypeActions({
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
    onContentTypeConditionsSelect({ subject: contentType.uid, conditions });
  };

  return (
    <RowWrapper withMargin={index % 2 !== 0}>
      <StyledRow disabled={isSuperAdmin} isActive={isActive} isGrey={index % 2 === 0}>
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <PermissionName disabled={isSuperAdmin}>
            <Checkbox
              onChange={handleAllContentTypeActions}
              name={contentType.name}
              disabled={isSuperAdmin}
              someChecked={
                contentTypeActions.length > 0 &&
                allCurrentActionsSize > 0 &&
                allCurrentActionsSize < allActionsSize
              }
              value={allCurrentActionsSize === allActionsSize}
            />
            <CollapseLabel
              title={contentType.name}
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
                {contentType.name}
              </Text>
              <Chevron icon={isActive ? 'chevron-up' : 'chevron-down'} />
            </CollapseLabel>
          </PermissionName>
          <PermissionWrapper disabled={isSuperAdmin}>
            {permissionsLayout.map(permissionLayout =>
              !isAttributeAction(permissionLayout.action) ? (
                <PermissionCheckbox
                  key={permissionLayout.action}
                  hasConditions={checkConditions(permissionLayout.action)}
                  disabled={isSuperAdmin}
                  value={hasContentTypeAction(permissionLayout.action)}
                  name={`${contentType.name}-${permissionLayout.action}`}
                  onChange={() => handleContentTypeActionSelect(permissionLayout.action)}
                />
              ) : (
                <PermissionCheckbox
                  key={permissionLayout.action}
                  hasConditions={checkConditions(permissionLayout.action)}
                  disabled={isSuperAdmin}
                  value={hasContentTypeAction(permissionLayout.action)}
                  someChecked={hasSomeAttributeByAction(permissionLayout.action)}
                  name={`${contentType.name}-${permissionLayout.action}`}
                  onChange={() => handleActionSelect(permissionLayout.action)}
                />
              )
            )}
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

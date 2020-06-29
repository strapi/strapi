import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Checkbox, Flex, Text, Padded } from '@buffetjs/core';

// TODO : This is why we need the babel module resolver plugin.
import { getAttributesToDisplay } from '../../../../../../src/utils';
import { usePermissionsContext } from '../../../../../../src/hooks';
import {
  ATTRIBUTES_PERMISSIONS_ACTIONS,
  isAttributeAction,
  getAttributePermissionsSizeByContentTypeAction,
  getAllAttributesActionsSize,
  getAttributesByModel,
} from '../../../../../../src/components/Roles/Permissions/utils';
import Chevron from '../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/Chevron';
import PermissionCheckbox from '../../../../../../src/components/Roles/Permissions/ContentTypes/PermissionCheckbox';
import PermissionName from '../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/PermissionName';
import StyledRow from '../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/StyledRow';
import ContentTypesAttributes from '../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ContentTypesAttributes';
import PermissionWrapper from '../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/PermissionWrapper';
import CollapseLabel from '../../../../../../src/components/Roles/Permissions/ContentTypes/CollapseLabel';
import SettingsButton from '../../../../../../src/components/Roles/SettingsButton';

import ConditionsModal from './ConditionsModal';

const ContentTypeRow = ({ index, contentType, permissionsLayout }) => {
  const [modalOpened, setOpenModal] = useState(false);
  const {
    collapsePath,
    onCollapse,
    contentTypesPermissions,
    components,
    onContentTypeActionSelect,
    onAttributesSelect,
    onAllContentTypeActions,
    isSuperAdmin,
  } = usePermissionsContext();
  const isActive = collapsePath[0] === contentType.uid;

  const numberOfContentTypeActions = useMemo(() => {
    return Object.values(
      get(contentTypesPermissions, [contentType.uid, 'contentTypeActions'], {})
    ).filter(action => !!action).length;
  }, [contentType, contentTypesPermissions]);

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

  // Number of all actions in the current content type.
  const allCurrentActionsSize = useMemo(() => {
    return (
      getAllAttributesActionsSize(contentType.uid, contentTypesPermissions) +
      numberOfContentTypeActions
    );
  }, [contentType, numberOfContentTypeActions, contentTypesPermissions]);

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

  const hasAllAttributeByAction = useCallback(
    action =>
      getAttributePermissionsSizeByContentTypeAction(contentTypesPermissions, contentType.uid, action) > 0 &&
      getAttributePermissionsSizeByContentTypeAction(contentTypesPermissions, contentType.uid, action) ===
        attributes.length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentTypesPermissions, contentType, attributes]
  );

  // Check if an attribute have the passed action
  // Used to set the someChecked props of an action checkbox
  const hasSomeAttributeByAction = useCallback(
    action =>
      getAttributePermissionsSizeByContentTypeAction(contentTypesPermissions, contentType.uid, action) > 0 &&
      getAttributePermissionsSizeByContentTypeAction(contentTypesPermissions, contentType.uid, action) <
        attributes.length &&
      hasContentTypeAction(action),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentTypesPermissions, contentType, attributes]
  );

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

  return (
    <>
      <StyledRow disabled={isSuperAdmin} isActive={isActive} isGrey={index % 2 === 0}>
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <PermissionName disabled={isSuperAdmin}>
            <Checkbox
              onChange={handleAllContentTypeActions}
              name={contentType.name}
              disabled={isSuperAdmin}
              someChecked={
                numberOfContentTypeActions > 0 &&
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
                  disabled={isSuperAdmin}
                  value={hasContentTypeAction(permissionLayout.action)}
                  hasConditions={false}
                  name={`${contentType.name}-${permissionLayout.action}`}
                  onChange={() => handleContentTypeActionSelect(permissionLayout.action)}
                />
              ) : (
                <PermissionCheckbox
                  key={permissionLayout.action}
                  disabled={isSuperAdmin}
                  value={hasContentTypeAction(permissionLayout.action)}
                  someChecked={hasSomeAttributeByAction(permissionLayout.action)}
                  hasConditions={false}
                  name={`${contentType.name}-${permissionLayout.action}`}
                  onChange={() => handleActionSelect(permissionLayout.action)}
                />
              )
            )}
          </PermissionWrapper>
          <SettingsButton onClick={() => setOpenModal(true)} />
        </Flex>
      </StyledRow>
      {isActive && (
        <ContentTypesAttributes contentType={contentType} attributes={attributesToDisplay} />
      )}
      <ConditionsModal
        actions={contentTypeActions}
        toggle={() => setOpenModal(!modalOpened)}
        isOpen={modalOpened}
      />
    </>
  );
};

ContentTypeRow.propTypes = {
  contentType: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  permissionsLayout: PropTypes.array.isRequired,
};

export default ContentTypeRow;

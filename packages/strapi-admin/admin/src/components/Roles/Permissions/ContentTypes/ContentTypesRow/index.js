import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Checkbox, Flex, Text, Padded } from '@buffetjs/core';

import { getAttributesToDisplay } from '../../../../../utils';
import { usePermissionsContext } from '../../../../../hooks';
import {
  ATTRIBUTES_PERMISSIONS_ACTIONS,
  isAttributeAction,
  getAttributePermissionsSizeByContentTypeAction,
  getAllAttributesActionsSize,
  getAttributesByModel,
} from '../../utils';
import Chevron from './Chevron';
import PermissionCheckbox from '../PermissionCheckbox';
import PermissionName from './PermissionName';
import StyledRow from './StyledRow';
import ContentTypesAttributes from './ContentTypesAttributes';
import PermissionWrapper from './PermissionWrapper';
import CollapseLabel from '../CollapseLabel';

const ContentTypeRow = ({ index, contentType, contentTypesPermissionsLayout }) => {
  const {
    collapsePath,
    onCollapse,
    permissions,
    components,
    onAllContentTypeActions,
  } = usePermissionsContext();
  const isActive = collapsePath[0] === contentType.uid;

  const contentTypeActions = Object.values(
    get(permissions, [contentType.uid, 'contentTypeActions'], {})
  ).filter(action => !!action);

  // Number of all actions in the current content type.
  const allCurrentActionsSize = useMemo(() => {
    return getAllAttributesActionsSize(contentType.uid, permissions) + contentTypeActions.length;
  }, [contentType, contentTypeActions, permissions]);

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

  const allActionsSize =
    attributes.length * ATTRIBUTES_PERMISSIONS_ACTIONS.length +
    contentTypesPermissionsLayout.length;

  const hasContentTypeAction = useCallback(
    action => get(permissions, [contentType.uid, 'contentTypeActions', action], false),
    [permissions, contentType]
  );

  // Check if an attribute have the passed action
  // Used to set the someChecked props of an action checkbox
  const hasSomeAttributeByAction = useCallback(
    action =>
      getAttributePermissionsSizeByContentTypeAction(permissions, contentType.uid, action) > 0 &&
      getAttributePermissionsSizeByContentTypeAction(permissions, contentType.uid, action) <
        attributes.length &&
      hasContentTypeAction(action),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, contentType, attributes]
  );

  const handleToggleAttributes = () => {
    onCollapse(0, contentType.uid);
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
      <StyledRow isActive={isActive} isGrey={index % 2 === 0}>
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <PermissionName>
            <Checkbox
              onChange={handleAllContentTypeActions}
              name={contentType.name}
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
          <PermissionWrapper disabled>
            {contentTypesPermissionsLayout.map(permissionLayout =>
              !isAttributeAction(permissionLayout.action) ? (
                <PermissionCheckbox
                  disabled
                  key={permissionLayout.action}
                  value={hasContentTypeAction(permissionLayout.action)}
                  hasConditions={false}
                  name={`${contentType.name}-${permissionLayout.action}`}
                />
              ) : (
                <PermissionCheckbox
                  disabeld
                  key={permissionLayout.action}
                  value={hasContentTypeAction(permissionLayout.action)}
                  someChecked={hasSomeAttributeByAction(permissionLayout.action)}
                  hasConditions={false}
                  name={`${contentType.name}-${permissionLayout.action}`}
                />
              )
            )}
          </PermissionWrapper>
        </Flex>
      </StyledRow>
      {isActive && (
        <ContentTypesAttributes contentType={contentType} attributes={attributesToDisplay} />
      )}
    </>
  );
};

ContentTypeRow.propTypes = {
  contentType: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  contentTypesPermissionsLayout: PropTypes.array.isRequired,
};

export default ContentTypeRow;

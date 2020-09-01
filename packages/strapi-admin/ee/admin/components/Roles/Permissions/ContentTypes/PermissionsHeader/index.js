import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import { usePermissionsContext } from '../../../../../../../admin/src/hooks';
import PermissionCheckbox from '../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/PermissionCheckbox';
import {
  getContentTypesActionsSize,
  isAttributeAction,
} from '../../../../../../../admin/src/components/Roles/Permissions/utils';
import Wrapper from '../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/PermissionsHeader/Wrapper';

const PermissionsHeader = ({ allAttributes, contentTypes }) => {
  const { formatMessage } = useIntl();
  const {
    onSetAttributesPermissions,
    onGlobalPermissionsActionSelect,
    onGlobalPublishActionSelect,
    permissionsLayout,
    contentTypesPermissions,
    isSuperAdmin,
  } = usePermissionsContext();

  const handleCheck = (action, value) => {
    const splitAction = action.split('.');
    const isPublishAction = splitAction[splitAction.length - 1] === 'publish';

    // If the action is present in the actions of the attributes
    // Then we set all the attributes contentTypesPermissions otherwise,
    // we only set the global content type actions
    if (isAttributeAction(action)) {
      onSetAttributesPermissions({
        attributes: allAttributes,
        action,
        shouldEnable: !value,
        hasContentTypeAction: true,
      });
    } else if (isPublishAction) {
      onGlobalPublishActionSelect({ contentTypes, value: !value });
    } else {
      onGlobalPermissionsActionSelect({
        action,
        contentTypes,
        shouldEnable: !value,
      });
    }
  };

  // Get the count of content type contentTypesPermissions by action.
  const countContentTypesActionPermissions = useCallback(
    action => {
      return getContentTypesActionsSize(contentTypes, contentTypesPermissions, action);
    },
    [contentTypes, contentTypesPermissions]
  );

  const hasSomeActions = permission => {
    return (
      countContentTypesActionPermissions(permission.action) > 0 &&
      countContentTypesActionPermissions(permission.action) <
        filteredContentTypes(permission.subjects).length
    );
  };

  const hasAllActions = permission => {
    return (
      countContentTypesActionPermissions(permission.action) ===
      filteredContentTypes(permission.subjects).length
    );
  };

  const filteredContentTypes = useCallback(
    subjects => contentTypes.filter(contentType => subjects.includes(contentType.uid)),
    [contentTypes]
  );

  const permissionsToDisplay = useMemo(() => {
    return permissionsLayout.sections.contentTypes.filter(
      permission => filteredContentTypes(permission.subjects).length > 0
    );
  }, [filteredContentTypes, permissionsLayout.sections.contentTypes]);

  return (
    <Wrapper disabled={isSuperAdmin}>
      <Flex>
        {permissionsToDisplay.map(permissionLayout => {
          const value = hasAllActions(permissionLayout);

          return (
            <PermissionCheckbox
              key={permissionLayout.action}
              name={permissionLayout.action}
              disabled={isSuperAdmin}
              value={value}
              someChecked={hasSomeActions(permissionLayout)}
              message={formatMessage({
                id: `Settings.roles.form.permissions.${permissionLayout.displayName.toLowerCase()}`,
                defaultMessage: permissionLayout.displayName,
              })}
              onChange={() => handleCheck(permissionLayout.action, value)}
            />
          );
        })}
      </Flex>
    </Wrapper>
  );
};

PermissionsHeader.propTypes = {
  contentTypes: PropTypes.array.isRequired,
  allAttributes: PropTypes.array.isRequired,
};

export default PermissionsHeader;

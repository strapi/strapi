import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import { usePermissionsContext } from '../../../../../hooks';
import PermissionCheckbox from '../PermissionCheckbox';
import { getContentTypesActionsSize, isAttributeAction } from '../../utils';
import Wrapper from './Wrapper';

const PermissionsHeader = ({ allAttributes, contentTypes }) => {
  const { formatMessage } = useIntl();
  const {
    onSetAttributesPermissions,
    onGlobalPermissionsActionSelect,
    permissionsLayout,
    permissions,
  } = usePermissionsContext();

  const handleCheck = action => {
    // If the action is present in the actions of the attributes
    // Then we set all the attributes permissions otherwise,
    // we only set the global content type actions
    if (isAttributeAction(action)) {
      onSetAttributesPermissions({
        attributes: allAttributes,
        action,
        shouldEnable: !hasAllActions(action),
        contentTypeAction: true,
      });
    } else {
      onGlobalPermissionsActionSelect({
        action,
        contentTypes,
        shouldEnable: !hasAllActions(action),
      });
    }
  };

  // Get the count of content type permissions by action.
  const countContentTypesActionPermissions = useCallback(
    action => {
      return getContentTypesActionsSize(contentTypes, permissions, action);
    },
    [contentTypes, permissions]
  );

  const hasSomeActions = action => {
    return (
      countContentTypesActionPermissions(action) > 0 &&
      countContentTypesActionPermissions(action) < contentTypes.length
    );
  };
  const hasAllActions = action => {
    return countContentTypesActionPermissions(action) === contentTypes.length;
  };

  return (
    <Wrapper>
      <Flex>
        {permissionsLayout.sections.contentTypes.map(permissionLayout => (
          <PermissionCheckbox
            key={permissionLayout.action}
            name={permissionLayout.action}
            value={hasAllActions(permissionLayout.action)}
            someChecked={hasSomeActions(permissionLayout.action)}
            message={formatMessage({
              id: `Settings.roles.form.permissions.${permissionLayout.displayName.toLowerCase()}`,
              defaultMessage: permissionLayout.displayName,
            })}
            onChange={() => handleCheck(permissionLayout.action)}
          />
        ))}
      </Flex>
    </Wrapper>
  );
};

PermissionsHeader.propTypes = {
  contentTypes: PropTypes.array.isRequired,
  allAttributes: PropTypes.array.isRequired,
};

export default PermissionsHeader;

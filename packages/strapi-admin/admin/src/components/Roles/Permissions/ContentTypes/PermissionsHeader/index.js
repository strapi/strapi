import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import { usePermissionsContext } from '../../../../../hooks';
import PermissionCheckbox from '../PermissionCheckbox';
import {
  getContentTypesActionsSize,
  getAllAttributes,
  getPermissionsCountByAction,
  isAttributeAction,
} from '../../utils';
import Wrapper from './Wrapper';

const PermissionsHeader = ({ contentTypes }) => {
  const { formatMessage } = useIntl();
  const {
    onSetAttributesPermissions,
    onGlobalPermissionsActionSelect,
    permissionsLayout,
    permissions,
    components,
  } = usePermissionsContext();

  const allAttributes = useMemo(() => {
    return getAllAttributes(contentTypes, components);
  }, [contentTypes, components]);

  const handleCheck = action => {
    if (isAttributeAction(action)) {
      onSetAttributesPermissions({
        attributes: allAttributes,
        action,
        shouldEnable: !hasAllActions(action),
      });
    } else {
      onGlobalPermissionsActionSelect({
        action,
        contentTypes,
        shouldEnable: !hasAllActions(action),
      });
    }
  };

  const permissionsCount = useCallback(
    action => {
      return getPermissionsCountByAction(contentTypes, permissions, action);
    },
    [contentTypes, permissions]
  );

  const contentTypesActionsSize = useCallback(
    action => {
      return getContentTypesActionsSize(contentTypes, permissions, action);
    },
    [contentTypes, permissions]
  );

  const hasAllActions = action => {
    return isAttributeAction(action)
      ? permissionsCount(action) === allAttributes.length
      : contentTypesActionsSize(action) === contentTypes.length;
  };

  return (
    <Wrapper>
      <Flex>
        {permissionsLayout.sections.contentTypes.map(permissionLayout => (
          <PermissionCheckbox
            key={permissionLayout.action}
            name={permissionLayout.action}
            value={hasAllActions(permissionLayout.action)}
            someChecked={
              permissionsCount(permissionLayout.action) > 0 &&
              permissionsCount(permissionLayout.action) < allAttributes.length
            }
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
};

export default PermissionsHeader;

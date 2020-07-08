import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import { usePermissionsContext } from '../../../../../hooks';
import PermissionCheckbox from '../PermissionCheckbox';
import { getContentTypesActionsSize } from '../../utils';
import Wrapper from './Wrapper';

const PermissionsHeader = ({ contentTypes }) => {
  const { formatMessage } = useIntl();
  const { permissionsLayout, contentTypesPermissions } = usePermissionsContext();

  // Get the count of content type contentTypesPermissions by action.
  const countContentTypesActionPermissions = useCallback(
    action => {
      return getContentTypesActionsSize(contentTypes, contentTypesPermissions, action);
    },
    [contentTypes, contentTypesPermissions]
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
    <Wrapper disabled>
      <Flex>
        {permissionsLayout.sections.contentTypes.map(permissionLayout => (
          <PermissionCheckbox
            key={permissionLayout.action}
            name={permissionLayout.action}
            disabled
            value={hasAllActions(permissionLayout.action)}
            someChecked={hasSomeActions(permissionLayout.action)}
            message={formatMessage({
              id: `Settings.roles.form.permissions.${permissionLayout.displayName.toLowerCase()}`,
              defaultMessage: permissionLayout.displayName,
            })}
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

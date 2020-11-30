import React, { useCallback, useMemo } from 'react';
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
    <Wrapper disabled>
      <Flex>
        {permissionsToDisplay.map(permissionLayout => (
          <PermissionCheckbox
            key={permissionLayout.action}
            name={permissionLayout.action}
            disabled
            value={hasAllActions(permissionLayout)}
            someChecked={hasSomeActions(permissionLayout)}
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

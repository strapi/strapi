import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import { usePermissionsContext } from '../../../../../hooks';
import PermissionCheckbox from '../PermissionCheckbox';
import {
  getContentTypesActionsSize,
  getPermissionsCountByAction,
  isAttributeAction,
} from '../../utils';
import Wrapper from './Wrapper';

const PermissionsHeader = ({ allAttributes, contentTypes }) => {
  const { formatMessage } = useIntl();
  const { permissionsLayout, contentTypesPermissions } = usePermissionsContext();

  // Get the count of content type contentTypesPermissions by action.
  const countContentTypesActionPermissions = useCallback(
    action => {
      return getContentTypesActionsSize(contentTypes, contentTypesPermissions, action);
    },
    [contentTypes, contentTypesPermissions]
  );

  const getNumberOfPermissionByAction = useCallback(
    action => {
      return getPermissionsCountByAction(contentTypes, contentTypesPermissions, action);
    },
    [contentTypes, contentTypesPermissions]
  );

  const hasSomeActions = permission => {
    if (!isAttributeAction(permission.action)) {
      return (
        countContentTypesActionPermissions(permission.action) > 0 &&
        countContentTypesActionPermissions(permission.action) <
          filteredContentTypes(permission.subjects).length
      );
    }

    const numberOfPermission = getNumberOfPermissionByAction(permission.action);

    return numberOfPermission > 0 && numberOfPermission < allAttributes.length;
  };

  const hasAllActions = permission => {
    if (!isAttributeAction(permission.action)) {
      return (
        countContentTypesActionPermissions(permission.action) ===
        filteredContentTypes(permission.subjects).length
      );
    }

    const numberOfPermission = getNumberOfPermissionByAction(permission.action);

    return numberOfPermission === allAttributes.length;
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
  allAttributes: PropTypes.array.isRequired,
  contentTypes: PropTypes.array.isRequired,
};

export default PermissionsHeader;

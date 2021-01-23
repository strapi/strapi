import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import { usePermissionsContext } from '../../../../../../../admin/src/hooks';
import PermissionCheckbox from '../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/PermissionCheckbox';
import {
  getPermissionsCountByAction,
  getContentTypesActionsSize,
  isAttributeAction,
} from '../../../../../../../admin/src/components/Roles/Permissions/utils';
import Wrapper from '../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/PermissionsHeader/Wrapper';

const PermissionsHeader = ({ allAttributes, contentTypes }) => {
  const { formatMessage } = useIntl();
  const {
    dispatch,
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
    // Create Read or Update
    if (isAttributeAction(action)) {
      dispatch({
        type: 'SET_ATTRIBUTES_PERMISSIONS',
        attributes: allAttributes,
        action,
        shouldEnable: !value,
        hasContentTypeAction: true,
      });
    } else if (isPublishAction) {
      dispatch({
        type: 'ON_GLOBAL_PUBLISH_ACTION_SELECT',
        contentTypes,
        value: !value,
      });
      // Delete action
    } else {
      dispatch({
        type: 'GLOBAL_PERMISSIONS_SELECT',
        action,
        contentTypes,
        shouldEnable: !value,
      });
    }
  };

  const hasSomeActions = (action, subjects) => {
    if (!isAttributeAction(action)) {
      const numberOfContentTypesPermissions = getContentTypesActionsSize(
        filteredContentTypes(subjects),
        contentTypesPermissions,
        action
      );

      return (
        numberOfContentTypesPermissions > 0 &&
        numberOfContentTypesPermissions < filteredContentTypes(subjects).length
      );
    }

    const numberOfPermissions = getPermissionsCountByAction(
      contentTypes,
      contentTypesPermissions,
      action
    );

    return numberOfPermissions > 0 && numberOfPermissions < allAttributes.length;
  };

  const hasAllActions = (action, subjects) => {
    if (!isAttributeAction(action)) {
      const numberOfContentTypesPermissions = getContentTypesActionsSize(
        filteredContentTypes(subjects),
        contentTypesPermissions,
        action
      );

      return numberOfContentTypesPermissions === filteredContentTypes(subjects).length;
    }

    const numberOfPermissions = getPermissionsCountByAction(
      contentTypes,
      contentTypesPermissions,
      action
    );

    return numberOfPermissions === allAttributes.length;
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
        {permissionsToDisplay.map(({ action, displayName, subjects }) => {
          const value = hasAllActions(action, subjects);

          return (
            <PermissionCheckbox
              key={action}
              name={action}
              disabled={isSuperAdmin}
              value={value}
              someChecked={hasSomeActions(action, subjects)}
              message={formatMessage({
                id: `Settings.roles.form.permissions.${displayName.toLowerCase()}`,
                defaultMessage: displayName,
              })}
              onChange={() => handleCheck(action, value)}
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

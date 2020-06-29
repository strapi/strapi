import React, { useCallback, useMemo } from 'react';
import { intersectionWith } from 'lodash';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Flex, Padded, Text, Checkbox } from '@buffetjs/core';

import { usePermissionsContext } from '../../../../../../../src/hooks';
import CheckboxWrapper from '../../../../../../../src/components/Roles/Permissions/PluginsAndSettingsPermissions/PermissionRow/CheckboxWrapper';
import BaselineAlignment from '../../../../../../../src/components/Roles/Permissions/PluginsAndSettingsPermissions/PermissionRow/BaselineAlignment';
import SubCategoryWrapper from '../../../../../../../src/components/Roles/Permissions/PluginsAndSettingsPermissions/PermissionRow/SubCategory/SubCategoryWrapper';

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid #f6f6f6;
  padding: 0px 10px;
`;

const SubCategory = ({ subCategory }) => {
  const {
    pluginsAndSettingsPermissions,
    onPluginSettingPermission,
    onPluginSettingSubCategoryPermission,
    isSuperAdmin,
  } = usePermissionsContext();

  const checkPermission = useCallback(
    action => {
      return (
        pluginsAndSettingsPermissions.findIndex(permission => permission.action === action) !== -1
      );
    },
    [pluginsAndSettingsPermissions]
  );

  const handlePermission = action => {
    onPluginSettingPermission(action);
  };

  const hasAllCategoryActions = useMemo(() => {
    return (
      intersectionWith(
        pluginsAndSettingsPermissions,
        subCategory.actions,
        (x, y) => x.action === y.action
      ).length === subCategory.actions.length
    );
  }, [pluginsAndSettingsPermissions, subCategory]);

  const hasSomeCategoryActions = useMemo(() => {
    const numberOfCurrentActions = intersectionWith(
      pluginsAndSettingsPermissions,
      subCategory.actions,
      (x, y) => x.action === y.action
    ).length;

    return numberOfCurrentActions > 0 && numberOfCurrentActions < subCategory.actions.length;
  }, [pluginsAndSettingsPermissions, subCategory]);

  const handleSubCategoryPermissions = () => {
    onPluginSettingSubCategoryPermission({
      actions: subCategory.actions,
      shouldEnable: !hasAllCategoryActions,
    });
  };

  return (
    <SubCategoryWrapper disabled={isSuperAdmin}>
      <Flex justifyContent="space-between" alignItems="center">
        <Padded right size="sm">
          <Text
            lineHeight="18px"
            color="#919bae"
            fontWeight="bold"
            fontSize="xs"
            textTransform="uppercase"
          >
            {subCategory.subCategory}
          </Text>
        </Padded>
        <Border />
        <Padded left size="sm">
          <BaselineAlignment />
          <Checkbox
            disabled={isSuperAdmin}
            name={`select-all-${subCategory.subCategory}`}
            message="Select all"
            onChange={handleSubCategoryPermissions}
            someChecked={hasSomeCategoryActions}
            value={hasAllCategoryActions}
          />
        </Padded>
      </Flex>
      <BaselineAlignment />
      <Padded top size="xs">
        <Flex flexWrap="wrap">
          {subCategory.actions.map(sc => (
            <CheckboxWrapper key={sc.action}>
              <Checkbox
                disabled={isSuperAdmin}
                value={checkPermission(sc.action)}
                name={sc.action}
                message={sc.displayName}
                onChange={() => handlePermission(sc.action)}
              />
            </CheckboxWrapper>
          ))}
        </Flex>
      </Padded>
    </SubCategoryWrapper>
  );
};

SubCategory.propTypes = {
  subCategory: PropTypes.object.isRequired,
};

export default SubCategory;

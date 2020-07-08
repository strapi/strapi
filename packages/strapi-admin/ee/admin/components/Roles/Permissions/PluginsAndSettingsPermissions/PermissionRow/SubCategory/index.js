import React, { useCallback, useMemo, useState } from 'react';
import { intersectionWith } from 'lodash';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Flex, Padded, Text, Checkbox } from '@buffetjs/core';

import { usePermissionsContext } from '../../../../../../../../admin/src/hooks';
import CheckboxWrapper from '../../../../../../../../admin/src/components/Roles/Permissions/PluginsAndSettingsPermissions/PermissionRow/CheckboxWrapper';
import BaselineAlignment from '../../../../../../../../admin/src/components/Roles/Permissions/PluginsAndSettingsPermissions/PermissionRow/BaselineAlignment';
import SubCategoryWrapper from '../../../../../../../../admin/src/components/Roles/Permissions/PluginsAndSettingsPermissions/PermissionRow/SubCategory/SubCategoryWrapper';
import ConditionsButtonWrapper from '../../../../../../../../admin/src/components/Roles/Permissions/PluginsAndSettingsPermissions/PermissionRow/SubCategory/ConditionsButtonWrapper';
import ConditionsModal from '../../../../../../../../admin/src/components/Roles/ConditionsModal';
import ConditionsButton from '../../../../../../../../admin/src/components/Roles/ConditionsButton';

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid #f6f6f6;
  padding: 0px 10px;
`;

const SubCategory = ({ subCategory }) => {
  const [modal, setModal] = useState({ isOpen: false, isMounted: false });
  const {
    isSuperAdmin,
    pluginsAndSettingsPermissions,
    onPluginSettingPermission,
    onPluginSettingSubCategoryPermission,
    onPluginSettingConditionsSelect,
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

  const currentPermissions = useMemo(() => {
    return intersectionWith(
      pluginsAndSettingsPermissions,
      subCategory.actions,
      (x, y) => x.action === y.action
    );
  }, [pluginsAndSettingsPermissions, subCategory.actions]);

  const hasAllCategoryActions = useMemo(() => {
    return currentPermissions.length === subCategory.actions.length;
  }, [currentPermissions, subCategory.actions]);

  const hasSomeCategoryActions = useMemo(() => {
    return currentPermissions.length > 0 && currentPermissions.length < subCategory.actions.length;
  }, [currentPermissions, subCategory.actions]);

  const categoryConditions = useMemo(() => {
    return currentPermissions.reduce((acc, current) => {
      return {
        ...acc,
        [current.action]: current.conditions,
      };
    }, {});
  }, [currentPermissions]);

  const hasCategoryConditions = useMemo(() => {
    return Object.values(categoryConditions).flat().length > 0;
  }, [categoryConditions]);

  const handleSubCategoryPermissions = () => {
    onPluginSettingSubCategoryPermission({
      actions: subCategory.actions,
      shouldEnable: !hasAllCategoryActions,
    });
  };

  const handleModalOpen = () => {
    setModal({
      isMounted: true,
      isOpen: true,
    });
  };

  const handleToggleModal = () => {
    setModal(prev => ({
      ...prev,
      isOpen: !prev.isOpen,
    }));
  };

  const handleClosed = () => {
    setModal(prev => ({ ...prev, isMounted: false }));
  };

  const actionsForConditions = useMemo(() => {
    return currentPermissions.map(permission => ({
      id: permission.action,
      displayName: subCategory.actions.find(perm => perm.action === permission.action).displayName,
    }));
  }, [currentPermissions, subCategory.actions]);

  const checkCategory = useCallback(
    action => {
      return categoryConditions[action] ? categoryConditions[action].length > 0 : false;
    },
    [categoryConditions]
  );

  const handleConditionsSubmit = conditions => {
    onPluginSettingConditionsSelect(conditions);
  };

  return (
    <>
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
              name={`select-all-${subCategory.subCategory}`}
              message="Select all"
              disabled={isSuperAdmin}
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
              <CheckboxWrapper
                disabled={isSuperAdmin}
                hasConditions={checkCategory(sc.action)}
                key={sc.action}
              >
                <Checkbox
                  value={checkPermission(sc.action)}
                  name={sc.action}
                  disabled={isSuperAdmin}
                  message={sc.displayName}
                  onChange={() => handlePermission(sc.action)}
                />
              </CheckboxWrapper>
            ))}
          </Flex>
          <ConditionsButtonWrapper disabled={isSuperAdmin} hasConditions={hasCategoryConditions}>
            <ConditionsButton hasConditions={hasCategoryConditions} onClick={handleModalOpen} />
          </ConditionsButtonWrapper>
        </Padded>
      </SubCategoryWrapper>
      {modal.isMounted && (
        <ConditionsModal
          actions={actionsForConditions}
          initialConditions={categoryConditions}
          onSubmit={handleConditionsSubmit}
          onToggle={handleToggleModal}
          isOpen={modal.isOpen}
          onClosed={handleClosed}
        />
      )}
    </>
  );
};

SubCategory.propTypes = {
  subCategory: PropTypes.object.isRequired,
};

export default SubCategory;

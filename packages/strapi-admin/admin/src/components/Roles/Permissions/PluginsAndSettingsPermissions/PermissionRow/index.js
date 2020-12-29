import React, { useMemo } from 'react';
import { Flex, Text } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { PermissionsWrapper, RowContainer } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import SubCategory from 'ee_else_ce/components/Roles/Permissions/PluginsAndSettingsPermissions/PermissionRow/SubCategory';

import RowStyle from './RowStyle';

const PermissionRow = ({
  openedCategory,
  onOpenCategory,
  permissions,
  isWhite,
  permissionType,
}) => {
  const { formatMessage } = useIntl();

  const categoryName = useMemo(() => {
    return permissions.category.includes('::')
      ? `${permissions.category.split('::')[1]}`
      : permissions.category;
  }, [permissions]);

  return (
    <RowContainer isWhite={isWhite}>
      <RowStyle
        isWhite={isWhite}
        isActive={openedCategory === permissions.category}
        key={permissions.category}
        onClick={onOpenCategory}
      >
        <Flex alignItems="center" justifyContent="space-between">
          <div>
            <Text color="grey" fontWeight="bold" fontSize="xs" textTransform="uppercase">
              {categoryName}
            </Text>
            <Text lineHeight="22px" color="grey">
              {formatMessage({ id: 'Settings.permissions.category' }, { category: categoryName })}
              &nbsp;{permissionType}
            </Text>
          </div>
          <div>
            <FontAwesomeIcon style={{ width: '11px' }} color="#9EA7B8" icon="chevron-down" />
          </div>
        </Flex>
      </RowStyle>
      {openedCategory === permissions.category && (
        <PermissionsWrapper isWhite={isWhite}>
          {permissions.subCategories.map(subCategory => (
            <SubCategory
              categoryName={categoryName}
              key={subCategory.subCategory}
              subCategory={subCategory}
            />
          ))}
        </PermissionsWrapper>
      )}
    </RowContainer>
  );
};

PermissionRow.defaultProps = {
  openedCategory: null,
  permissionType: null,
};
PermissionRow.propTypes = {
  openedCategory: PropTypes.string,
  onOpenCategory: PropTypes.func.isRequired,
  permissions: PropTypes.object.isRequired,
  isWhite: PropTypes.bool.isRequired,
  permissionType: PropTypes.string,
};

export default PermissionRow;

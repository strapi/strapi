import React, { useMemo } from 'react';
import { Flex, Text } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import getTrad from '../../../utils/getTrad';
import SubCategory from './SubCategory';
import RowStyle from './RowStyle';
import PermissionsWrapper from './PermissionsWrapper';

const PermissionRow = ({ openedPlugin, onOpenPlugin, permissions, isWhite, permissionType }) => {
  const { formatMessage } = useIntl();

  const subCategories = useMemo(() => {
    return Object.values(permissions.controllers).reduce((acc, curr, index) => {
      return [
        ...acc,
        {
          actions: curr,
          name: Object.keys(permissions.controllers)[index],
        },
      ];
    }, []);
  }, [permissions]);

  return (
    <>
      <RowStyle
        isWhite={isWhite}
        isActive={openedPlugin === permissions.name}
        key={permissions.name}
        onClick={onOpenPlugin}
      >
        <Flex alignItems="center" justifyContent="space-between">
          <div>
            <Text color="grey" fontWeight="bold" fontSize="xs" textTransform="uppercase">
              {permissions.name}
            </Text>
            <Text lineHeight="22px" color="grey">
              {formatMessage(
                { id: getTrad('Plugin.permissions.plugins.description') },
                { name: permissions.name }
              )}
              &nbsp;{permissionType}
            </Text>
          </div>
          <div>
            <FontAwesomeIcon
              style={{ width: '11px' }}
              color="#9EA7B8"
              icon={openedPlugin === permissions.name ? 'chevron-up' : 'chevron-down'}
            />
          </div>
        </Flex>
      </RowStyle>
      {openedPlugin === permissions.name && (
        <PermissionsWrapper>
          {subCategories.map(subCategory => (
            <SubCategory key={subCategory.name} subCategory={subCategory} />
          ))}
        </PermissionsWrapper>
      )}
    </>
  );
};

PermissionRow.defaultProps = {
  openedPlugin: null,
  permissionType: null,
};
PermissionRow.propTypes = {
  openedPlugin: PropTypes.string,
  onOpenPlugin: PropTypes.func.isRequired,
  permissions: PropTypes.object.isRequired,
  isWhite: PropTypes.bool.isRequired,
  permissionType: PropTypes.string,
};

export default PermissionRow;

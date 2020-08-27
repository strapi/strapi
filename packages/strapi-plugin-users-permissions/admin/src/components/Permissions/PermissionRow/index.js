import React, { useMemo } from 'react';
import { Flex, Text } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import getTrad from '../../../utils/getTrad';
import SubCategory from './SubCategory';
import RowStyle from './RowStyle';
import PermissionsWrapper from './PermissionsWrapper';

const PermissionRow = ({ isOpen, isWhite, name, onOpenPlugin, permissions }) => {
  const { formatMessage } = useIntl();

  const subCategories = useMemo(() => {
    // Avoid computing when not necesserary
    if (!isOpen) {
      return [];
    }

    return Object.values(permissions.controllers).reduce((acc, curr, index) => {
      const testName = `${name}.controllers.${Object.keys(permissions.controllers)[index]}`;
      const actions = Object.keys(curr).reduce((acc, current) => {
        return [
          ...acc,
          {
            ...curr[current],
            name: current,
            label: current,
            testName: `${testName}.${current}`,
          },
        ];
      }, []);

      return [
        ...acc,
        {
          actions: curr,
          testActions: actions,
          testName,
          name: Object.keys(permissions.controllers)[index],
          // TODO:
        },
      ];
    }, []);
  }, [isOpen, name, permissions]);

  return (
    <>
      <RowStyle isActive={isOpen} isWhite={isWhite} onClick={onOpenPlugin}>
        <Flex alignItems="center" justifyContent="space-between">
          <div>
            <Text color="grey" fontWeight="bold" fontSize="xs" textTransform="uppercase">
              {name}
            </Text>
            <Text lineHeight="22px" color="grey">
              {formatMessage({ id: getTrad('Plugin.permissions.plugins.description') }, { name })}
            </Text>
          </div>
          <div>
            <FontAwesomeIcon
              style={{ width: '11px' }}
              color="#9EA7B8"
              icon={isOpen ? 'chevron-up' : 'chevron-down'}
            />
          </div>
        </Flex>
      </RowStyle>
      {isOpen && (
        <PermissionsWrapper>
          {subCategories.map(subCategory => (
            <SubCategory key={subCategory.name} subCategory={subCategory} />
          ))}
        </PermissionsWrapper>
      )}
    </>
  );
};

PermissionRow.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  isWhite: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  onOpenPlugin: PropTypes.func.isRequired,
  permissions: PropTypes.object.isRequired,
};

export default PermissionRow;

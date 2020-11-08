import React, { useMemo } from 'react';
import { Flex, Text } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { sortBy } from 'lodash';
import { PermissionsWrapper, RowContainer } from 'strapi-helper-plugin';

import getTrad from '../../../utils/getTrad';
import SubCategory from './SubCategory';
import RowStyle from './RowStyle';

const PermissionRow = ({ isOpen, isWhite, name, onOpenPlugin, permissions }) => {
  const { formatMessage } = useIntl();

  const subCategories = useMemo(() => {
    // Avoid computing when not necesserary
    if (!isOpen) {
      return [];
    }

    return sortBy(
      Object.values(permissions.controllers).reduce((acc, curr, index) => {
        const currentName = `${name}.controllers.${Object.keys(permissions.controllers)[index]}`;
        const actions = sortBy(
          Object.keys(curr).reduce((acc, current) => {
            return [
              ...acc,
              {
                ...curr[current],
                label: current,
                name: `${currentName}.${current}`,
              },
            ];
          }, []),
          'label'
        );

        return [
          ...acc,
          {
            actions,
            label: Object.keys(permissions.controllers)[index],
            name: currentName,
          },
        ];
      }, []),
      'label'
    );
  }, [isOpen, name, permissions]);

  return (
    <RowContainer isWhite={isWhite}>
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
        <PermissionsWrapper isWhite={isWhite}>
          {subCategories.map(subCategory => (
            <SubCategory key={subCategory.name} subCategory={subCategory} />
          ))}
        </PermissionsWrapper>
      )}
    </RowContainer>
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

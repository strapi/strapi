import React, { useMemo } from 'react';

import { Box } from '@strapi/design-system';
import sortBy from 'lodash/sortBy';
import PropTypes from 'prop-types';

import SubCategory from './SubCategory';

const PermissionRow = ({ name, permissions }) => {
  const subCategories = useMemo(() => {
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
  }, [name, permissions]);

  return (
    <Box padding={6}>
      {subCategories.map((subCategory) => (
        <SubCategory key={subCategory.name} subCategory={subCategory} />
      ))}
    </Box>
  );
};

PermissionRow.propTypes = {
  name: PropTypes.string.isRequired,
  permissions: PropTypes.object.isRequired,
};

export default PermissionRow;

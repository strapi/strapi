import { useMemo } from 'react';

import { Box } from '@strapi/design-system';
import sortBy from 'lodash/sortBy';

import SubCategory, { SubCategoryShape } from './SubCategory';

interface PermissionRowProps {
  name: string;
  permissions: {
    controllers: Record<string, Record<string, SubCategoryShape>>;
  };
}

const PermissionRow = ({ name, permissions }: PermissionRowProps) => {
  const subCategories = useMemo(() => {
    return sortBy(
      Object.values(permissions.controllers).reduce<SubCategoryShape[]>((acc, curr, index) => {
        const currentName = `${name}.controllers.${Object.keys(permissions.controllers)[index]}`;
        const actions = sortBy(
          Object.keys(curr).reduce<SubCategoryShape[]>((acc, current) => {
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

export default PermissionRow;

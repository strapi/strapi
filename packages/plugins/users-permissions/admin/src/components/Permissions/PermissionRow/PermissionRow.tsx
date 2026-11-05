import React, { useMemo } from 'react';

import { Box } from '@strapi/design-system';
import sortBy from 'lodash/sortBy';

import { SubCategory } from './SubCategory';

import type { PluginPermissions } from '../../../types';

/** Lists a plugin's controllers and actions in label order. */
const PermissionRow = ({ name, permissions }: { name: string; permissions: PluginPermissions }) => {
  const subCategories = useMemo(() => {
    return sortBy(
      Object.entries(permissions.controllers).map(([controller, actions]) => {
        const currentName = `${name}.controllers.${controller}`;
        return {
          name: currentName,
          label: controller,
          actions: sortBy(
            Object.entries(actions).map(([action, permission]) => ({
              ...permission,
              label: action,
              name: `${currentName}.${action}`,
            })),
            'label'
          ),
        };
      }),
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

export { PermissionRow };

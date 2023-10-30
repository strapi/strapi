import type { Permission } from '@strapi/helper-plugin';

interface PermissionMap {
  marketplace: {
    main: Permission[];
  };
}

export { PermissionMap };

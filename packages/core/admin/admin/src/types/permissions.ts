import type { Permission } from '@strapi/helper-plugin';

interface PermissionMap {
  marketplace: {
    main: Permission[];
  };
  /**
   * TODO: remove the use of record to make it "concrete".
   */
  settings: Record<
    string,
    {
      main: Permission[];
      create: Permission[];
      read: Permission[];
      update: Permission[];
      delete: Permission[];
    }
  >;
}

export { PermissionMap };

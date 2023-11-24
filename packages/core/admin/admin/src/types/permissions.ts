import type { Permission } from '@strapi/helper-plugin';

type SettingsPermissions =
  | 'api-tokens'
  | 'project-settings'
  | 'roles'
  | 'sso'
  | 'transfer-tokens'
  | 'users'
  | 'webhooks';

interface CRUDPermissions {
  main: Permission[];
  read: Permission[];
  create: Permission[];
  update: Permission[];
  delete: Permission[];
  [key: string]: Permission[];
}

interface PermissionMap {
  contentManager: CRUDPermissions;
  marketplace: CRUDPermissions;
  settings: Record<SettingsPermissions, CRUDPermissions>;
}

export { PermissionMap };

import type { Data } from '@strapi/types';
import type { Permission, PluginContext } from '../types';

const PUBLIC_ROLE_FILTER = { role: { type: 'public' } };

/** Read role permissions and translate them to Content API actions. */
export default ({ strapi }: PluginContext) => ({
  /**
   * Find permissions associated to a specific role ID
   */
  async findRolePermissions(roleID: Data.ID): Promise<Permission[]> {
    return strapi.db.query('plugin::users-permissions.role').load({ id: roleID }, 'permissions');
  },

  /**
   * Find permissions for the public role
   */
  async findPublicPermissions(): Promise<Permission[]> {
    return strapi.db.query('plugin::users-permissions.permission').findMany({
      where: PUBLIC_ROLE_FILTER,
    });
  },

  /**
   * Transform a Users-Permissions' action into a content API one
   */
  toContentAPIPermission<T extends Pick<Permission, 'action'>>(permission: T) {
    const { action } = permission;

    return { action };
  },
});

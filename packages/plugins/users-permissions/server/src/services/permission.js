'use strict';

const PUBLIC_ROLE_FILTER = { role: { type: 'public' } };

module.exports = ({ strapi }) => ({
  /**
   * Find permissions associated to a specific role ID
   *
   * @param {number} roleID
   *
   * @return {object[]}
   */
  async findRolePermissions(roleID) {
    return strapi.db.query('plugin::users-permissions.role').load({ id: roleID }, 'permissions');
  },

  /**
   * Find permissions for the public role
   *
   * @return {object[]}
   */
  async findPublicPermissions() {
    return strapi.db.query('plugin::users-permissions.permission').findMany({
      where: PUBLIC_ROLE_FILTER,
    });
  },

  /**
   * Transform a Users-Permissions' action into a content API one
   *
   * @param {object} permission
   * @param {string} permission.action
   *
   * @return {{ action: string }}
   */
  toContentAPIPermission(permission) {
    const { action } = permission;

    return { action };
  },
});

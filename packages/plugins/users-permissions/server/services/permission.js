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
    return strapi.entityService.load(
      'plugin::users-permissions.role',
      { id: roleID },
      'permissions'
    );
  },

  /**
   * Find permissions for the public role
   *
   * @return {object[]}
   */
  async findPublicPermissions() {
    return strapi.entityService.findMany('plugin::users-permissions.permission', {
      where: PUBLIC_ROLE_FILTER,
    });
  },

  /**
   * Transform a Users-Permissions' permission into a content API one
   *
   * @example
   * const upPermission = { action: 'api::foo.foo.find' };
   *
   * const permission = toContentAPIPermission(upPermission);
   * // ^? { action: 'find', subject: 'api::foo.foo' }
   *
   * @param {object} permission
   * @param {string} permission.action
   *
   * @return {{ action: string, subject: string }}
   */
  toContentAPIPermission(permission) {
    const { action } = permission;
    const actionIndex = action.lastIndexOf('.');

    return {
      action: action.slice(actionIndex + 1),
      subject: action.slice(0, actionIndex),
    };
  },
});

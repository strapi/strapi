'use strict';

const { createPermission } = require('../domain/permission');
const actionProvider = require('./action-provider');

/**
 * Delete permissions of roles in database
 * @param params ids of roles
 * @returns {Promise<array>}
 */
const deleteByRolesIds = rolesIds => {
  return strapi.query('permission', 'admin').delete({ role_in: rolesIds });
};

/**
 * Find assigned permissions in the database
 * @param params query params to find the permissions
 * @returns {Promise<array<Object>>}
 */
const find = (params = {}) => {
  return strapi.query('permission', 'admin').find(params, []);
};

/**
 * Assign permissions to a role
 * @param {string|int} roleID - role ID
 * @param {Array<Permission{action,subject,fields,conditions}>} permissions - permissions to assign to the role
 */
const assign = async (roleID, permissions = []) => {
  const existingActions = strapi.admin.services.permission.provider.getAll();
  for (let permission of permissions) {
    const actionExists = existingActions.find(
      ea =>
        ea.actionId === permission.action &&
        (ea.section !== 'contentTypes' || ea.subjects.includes(permission.subject))
    );
    if (!actionExists) {
      throw strapi.errors.badRequest(
        `ValidationError', 'This action doesn't exist: ${JSON.stringify(permission)}`
      );
    }
  }

  await strapi.query('permission', 'admin').delete({ role: roleID });

  const permissionsWithRole = permissions.map(permission => {
    return createPermission({ ...permission, role: roleID });
  });

  const newPermissions = [];
  for (const permission of permissionsWithRole) {
    const result = await strapi.query('permission', 'admin').create(permission);
    newPermissions.push(result);
  }

  return newPermissions;
};

module.exports = {
  find,
  deleteByRolesIds,
  assign,
  provider: actionProvider,
};

'use strict';

const _ = require('lodash');
const { createPermission } = require('../domain/permission');
const actionProvider = require('./action-provider');
const { validatePermissionsExist } = require('../validation/permission');
const defaultConditions = require('./permission/default-conditions');
const createConditionProvider = require('./permission/condition-provider');
const createPermissionEngine = require('./permission/engine');

const conditionProvider = createConditionProvider(defaultConditions);
const engine = createPermissionEngine(conditionProvider);

/**
 * Delete permissions of roles in database
 * @param rolesIds ids of roles
 * @returns {Promise<array>}
 */
const deleteByRolesIds = rolesIds => {
  return strapi.query('permission', 'admin').delete({ role_in: rolesIds });
};

/**
 * Delete permissions
 * @param ids ids of permissions
 * @returns {Promise<array>}
 */
const deleteByIds = ids => {
  return strapi.query('permission', 'admin').delete({ id_in: ids });
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
  try {
    await validatePermissionsExist(permissions);
  } catch (err) {
    throw strapi.errors.badRequest('ValidationError', err);
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

/**
 * Find all permissions for a user
 * @param roles
 * @returns {Promise<*[]|*>}
 */
const findUserPermissions = async ({ roles }) => {
  if (!_.isArray(roles)) {
    return [];
  }

  return strapi.query('permission', 'admin').find({ role_in: roles.map(_.property('id')) });
};

/**
 * Removes unwanted fields from a permission
 * @param permission
 * @returns {*}
 */
const sanitizePermission = permission =>
  _.pick(permission, ['action', 'subject', 'fields', 'conditions']);

module.exports = {
  find,
  deleteByRolesIds,
  deleteByIds,
  assign,
  sanitizePermission,
  findUserPermissions,
  actionProvider,
  engine,
  conditionProvider,
};

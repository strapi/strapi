'use strict';

const _ = require('lodash');
const { createPermission } = require('../domain/permission');
const actionProvider = require('./permission/action-provider');
const { validatePermissionsExist } = require('../validation/permission');
const createConditionProvider = require('./permission/condition-provider');
const createPermissionEngine = require('./permission/engine');

const conditionProvider = createConditionProvider();
const engine = createPermissionEngine(conditionProvider);

const fieldsToCompare = ['action', 'subject', 'fields', 'conditions'];
const arePermissionsEqual = (perm1, perm2) =>
  _.isEqual(_.pick(perm1, fieldsToCompare), _.pick(perm2, fieldsToCompare));

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
 * @param {string|int} roleId - role ID
 * @param {Array<Permission{action,subject,fields,conditions}>} permissions - permissions to assign to the role
 */
const assign = async (roleId, permissions = []) => {
  try {
    await validatePermissionsExist(permissions);
  } catch (err) {
    throw strapi.errors.badRequest('ValidationError', err);
  }

  const permissionsWithRole = permissions.map(permission =>
    createPermission({ ...permission, role: roleId })
  );

  const existingPermissions = await find({ role: roleId, _limit: -1 });
  const permissionsToAdd = _.differenceWith(
    permissionsWithRole,
    existingPermissions,
    arePermissionsEqual
  );
  const permissionsToDelete = _.differenceWith(
    existingPermissions,
    permissionsWithRole,
    arePermissionsEqual
  );

  if (permissionsToDelete.length > 0) {
    await deleteByIds(permissionsToDelete.map(p => p.id));
  }
  if (permissionsToAdd.length > 0) {
    await strapi.query('permission', 'admin').createMany(permissionsToAdd);
  }

  return find({ role: roleId, _limit: -1 });
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

  return strapi
    .query('permission', 'admin')
    .find({ role_in: roles.map(_.property('id')), _limit: -1 });
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

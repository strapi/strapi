'use strict';

const _ = require('lodash');
const PromisePool = require('es6-promise-pool');
const { createPermission } = require('../domain/permission');
const actionProvider = require('./action-provider');
const { validatePermissionsExist } = require('../validation/permission');
const createConditionProvider = require('./permission/condition-provider');
const createPermissionEngine = require('./permission/engine');

const conditionProvider = createConditionProvider();
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
 * @param {string|int} roleId - role ID
 * @param {Array<Permission{action,subject,fields,conditions}>} permissions - permissions to assign to the role
 */
const assign = async (roleId, permissions = []) => {
  try {
    await validatePermissionsExist(permissions);
  } catch (err) {
    console.log('err', err);
    throw strapi.errors.badRequest('ValidationError', err);
  }

  await strapi.query('permission', 'admin').delete({ role: roleId });

  const permissionsWithRole = permissions.map(permission => {
    return createPermission({ ...permission, role: roleId });
  });

  const newPermissions = [];
  const errors = [];
  const generatePromises = function*() {
    for (let permission of permissionsWithRole) {
      yield strapi.query('permission', 'admin').create(permission);
    }
  };
  const pool = new PromisePool(generatePromises(), 100);
  pool.addEventListener('fulfilled', e => newPermissions.push(e.data.result));
  pool.addEventListener('reject', e => errors.push(e.error));
  await pool.start();

  if (errors.length > 0) {
    throw errors[0];
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

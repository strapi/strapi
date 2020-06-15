'use strict';

const _ = require('lodash');

const sanitizeRole = role => {
  return _.omit(role, ['users', 'permissions']);
};

/**
 * Create and save a role in database
 * @param attributes A partial role object
 * @returns {Promise<role>}
 */
const create = async attributes => {
  const alreadyExists = await exists({ name: attributes.name });
  if (alreadyExists) {
    throw strapi.errors.badRequest('ValidationError', {
      name: [`The name must be unique and a role with name \`${attributes.name}\` already exists.`],
    });
  }

  return strapi.query('role', 'admin').create(attributes);
};

/**
 * Find a role in database
 * @param params query params to find the role
 * @returns {Promise<role>}
 */
const findOne = (params = {}, populate = []) => {
  return strapi.query('role', 'admin').findOne(params, populate);
};

/**
 * Find a role in database with usersCounts
 * @param params query params to find the role
 * @returns {Promise<role>}
 */
const findOneWithUsersCount = async (params = {}, populate = []) => {
  const role = await strapi.query('role', 'admin').findOne(params, populate);

  if (role) {
    const usersCounts = await getUsersCount(role.id);
    role.usersCount = usersCounts;
  }

  return role;
};

/**
 * Find roles in database
 * @param params query params to find the roles
 * @returns {Promise<array>}
 */
const find = (params = {}, populate = []) => {
  return strapi.query('role', 'admin').find(params, populate);
};

/**
 * Find all roles in database
 * @returns {Promise<array>}
 */
const findAllWithUsersCount = async (populate = []) => {
  const roles = await strapi.query('role', 'admin').find({ _limit: -1 }, populate);
  for (let role of roles) {
    const usersCount = await getUsersCount(role.id);
    role.usersCount = usersCount;
  }

  return roles;
};

/**
 * Update a role in database
 * @param params query params to find the role to update
 * @param attributes A partial role object
 * @returns {Promise<role>}
 */
const update = async (params, attributes) => {
  if (_.has(attributes, 'code')) {
    const rolesToBeUpdated = await find(params);
    const rolesToBeUpdatedIds = rolesToBeUpdated.map(r => r.id).map(String);
    const adminRole = await getAdmin();

    console.log('rolesToBeUpdatedIds', rolesToBeUpdatedIds);
    console.log(adminRole, adminRole.id);

    if (rolesToBeUpdatedIds.includes(String(adminRole.id))) {
      throw strapi.errors.badRequest(
        'ValidationError',
        'You cannot modify the code of  the super admin role'
      );
    }
  }

  if (_.has(params, 'id') && _.has(attributes, 'name')) {
    const alreadyExists = await exists({ name: attributes.name, id_ne: params.id });
    if (alreadyExists) {
      throw strapi.errors.badRequest('ValidationError', {
        name: [
          `The name must be unique and a role with name \`${attributes.name}\` already exists.`,
        ],
      });
    }
  }

  return strapi.query('role', 'admin').update(params, attributes);
};

/**
 * Check if a role exists in database
 * @param params query params to find the role
 * @returns {Promise<boolean>}
 */
const exists = async params => {
  const foundCount = await strapi.query('role', 'admin').count(params);

  return foundCount > 0;
};

/**
 * Delete roles in database if they have no user assigned
 * @param ids query params to find the roles
 * @returns {Promise<array>}
 */
const deleteByIds = async (ids = []) => {
  const adminRole = await getAdmin();
  if (ids.map(String).includes(String(adminRole.id))) {
    throw strapi.errors.badRequest('ValidationError', {
      ids: ['You cannot delete the super admin role'],
    });
  }

  for (let roleId of ids) {
    const usersCount = await getUsersCount(roleId);
    if (usersCount !== 0) {
      throw strapi.errors.badRequest('ValidationError', {
        ids: ['Some roles are still assigned to some users.'],
      });
    }
  }

  await strapi.admin.services.permission.deleteByRolesIds(ids);

  let deletedRoles = await strapi.query('role', 'admin').delete({ id_in: ids });

  if (!Array.isArray(deletedRoles)) {
    deletedRoles = [deletedRoles];
  }

  return deletedRoles;
};

/** Count the number of users for some roles
 * @param rolesIds
 * @returns {Promise<integer>}
 */
const getUsersCount = async roleId => {
  return strapi.query('user', 'admin').count({ roles: [roleId] });
};

/** Returns admin role
 * @returns {Promise<role>}
 */
const getAdmin = () => findOne({ code: strapi.admin.config.superAdminCode });

/** Returns admin role with userCount
 * @returns {Promise<role>}
 */
const getAdminWithUsersCount = () =>
  findOneWithUsersCount({ code: strapi.admin.config.superAdminCode });

module.exports = {
  sanitizeRole,
  create,
  findOne,
  findOneWithUsersCount,
  find,
  findAllWithUsersCount,
  update,
  exists,
  deleteByIds,
  getUsersCount,
  getAdmin,
  getAdminWithUsersCount,
};

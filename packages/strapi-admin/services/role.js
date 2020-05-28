const _ = require('lodash');

const sanitizeRole = role => {
  return _.omit(role, ['users']);
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
const findOne = (params = {}) => {
  return strapi.query('role', 'admin').findOne(params);
};

/**
 * Find roles in database
 * @param params query params to find the roles
 * @returns {Promise<array>}
 */
const find = (params = {}) => {
  return strapi.query('role', 'admin').find(params);
};

/**
 * Find all roles in database
 * @returns {Promise<array>}
 */
const findAll = () => {
  return strapi.query('role', 'admin').find({ _limit: -1 });
};

/**
 * Update a role in database
 * @param params query params to find the role to update
 * @param attributes A partial role object
 * @returns {Promise<role>}
 */
const update = async (params, attributes) => {
  if (_.has(params, 'id')) {
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
 * @param params query params to find the roles
 * @returns {Promise<boolean>}
 */
const deleteByIds = async (ids = []) => {
  for (let id of ids) {
    const count = await strapi.query('user', 'admin').count({ 'roles.id': id });
    if (count !== 0) {
      throw strapi.errors.badRequest('ValidationError', {
        ids: ['Some roles are still assigned to some users.'],
      });
    }
  }

  // TODO: Waiting for permissions
  // await strapi.admin.services.permission.delete({ roleId_in: rolesToDeleteIds });

  let deletedRoles = await strapi.query('role', 'admin').delete({ id_in: ids });

  if (!Array.isArray(deletedRoles)) {
    deletedRoles = [deletedRoles];
  }

  return deletedRoles;
};

module.exports = {
  sanitizeRole,
  create,
  findOne,
  find,
  findAll,
  update,
  exists,
  deleteByIds,
};

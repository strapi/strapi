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
  const existingSameRole = await strapi.query('role', 'admin').findOne({ name: attributes.name });
  if (existingSameRole) {
    throw new Error(
      `The name must be unique and a role with name \`${existingSameRole.name}\` already exists.`
    );
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
    const existingSameRole = await strapi
      .query('role', 'admin')
      .findOne({ name: attributes.name, id_ne: params.id });
    if (existingSameRole) {
      throw new Error(
        `The name must be unique and a role with name \`${existingSameRole.name}\` already exists.`
      );
    }
  }

  return strapi.query('role', 'admin').update(params, attributes);
};

module.exports = {
  sanitizeRole,
  create,
  findOne,
  find,
  findAll,
  update,
};

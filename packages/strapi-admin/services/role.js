/**
 * Create and save a role in database
 * @param attributes A partial role object
 * @returns {Promise<role>}
 */
const create = attributes => {
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

module.exports = {
  create,
  findOne,
  find,
  findAll,
};

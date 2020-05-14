'use strict';

const { createUser } = require('../domain/user');

/**
 * Create and save a user in database
 * @param attributes A partial user object
 * @returns {Promise<user>}
 */
async function create(attributes) {
  const user = createUser(attributes);
  return strapi.query('user', 'admin').create(user);
}

/**
 * Check if a user with specific attributes exists in the database
 * @param attributes A partial user object
 * @returns {Promise<boolean>}
 */
async function exists(attributes) {
  return (await strapi.query('user', 'admin').count(attributes)) > 0;
}

module.exports = {
  create,
  exists,
};

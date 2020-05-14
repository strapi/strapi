'use strict';

const { createUser } = require('../domain/user');
const _ = require('lodash');

/**
 * Remove private user fields
 * @param {Object} user - user to sanitize
 */
const sanitizeUser = user => {
  return _.omit(user, ['password', 'resetPasswordToken']);
};

/**
 * Create and save a user in database
 * @param attributes A partial user object
 * @returns {Promise<user>}
 */
const create = async attributes => {
  const user = createUser(attributes);
  return strapi.query('user', 'admin').create(user);
};

/**
 * Check if a user with specific attributes exists in the database
 * @param attributes A partial user object
 * @returns {Promise<boolean>}
 */
const exists = async attributes => {
  return (await strapi.query('user', 'admin').count(attributes)) > 0;
};

module.exports = {
  create,
  exists,
  sanitizeUser,
};

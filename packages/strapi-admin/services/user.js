'use strict';

const _ = require('lodash');
const { createUser } = require('../domain/user');

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
  const user = createUser({
    registrationToken: strapi.admin.services.token.createToken(),
    ...attributes,
  });

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

/**
 * Returns a user registration info
 * @param {string} registrationToken - a user registration token
 * @returns {Promise<registrationInfo>} - Returns user email, firstname and lastname
 */
const findRegistrationInfo = async registrationToken => {
  const user = await strapi.query('user', 'admin').findOne({ registrationToken });

  if (!user) {
    return undefined;
  }

  return _.pick(user, ['email', 'firstname', 'lastname']);
};

module.exports = {
  sanitizeUser,
  create,
  exists,
  findRegistrationInfo,
};

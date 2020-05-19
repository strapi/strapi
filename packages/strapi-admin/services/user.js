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
 * Update a user in database
 * @param params query params to find the user to update
 * @param attributes A partial user object
 * @returns {Promise<user>}
 */
const update = async (params, attributes) => {
  return strapi.query('user', 'admin').update(params, attributes);
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

/**
 * Registers a user based on a registrationToken and some informations to update
 * @param {Object} params
 * @param {Object} params.registrationInfo registration token
 * @param {Object} params.userInfo user info
 */
const register = async ({ registrationToken, userInfo }) => {
  const matchingUser = await strapi.query('user', 'admin').findOne({registrationToken});

  if (!matchingUser) {
    throw strapi.errors.badRequest('Invalid registration info');
  }

  const hashedPassword = await strapi.admin.services.auth.hashPassword(userInfo.password);

  return strapi.admin.services.user.update(
    {id: matchingUser.id},
    {
      password: hashedPassword,
      firstname: userInfo.firstname,
      lastname: userInfo.lastname,
      registrationToken: null,
      isActive: true,
    }
  );
}

/** Find many users (paginated)
 * @param query
 * @returns {Promise<user>}
 */
const findPage = async query => {
  return strapi.query('user', 'admin').findPage(query);
};

module.exports = {
  create,
  update,
  exists,
  findRegistrationInfo,
  register,
  sanitizeUser,
  findPage,
};

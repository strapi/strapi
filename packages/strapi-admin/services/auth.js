'use strict';

const _ = require('lodash');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const sanitizeUser = user => {
  return _.omit(user, ['password', 'resetPasswordToken']);
};

const defaultOptions = { expiresIn: '30d' };

const getJWTOptions = () => {
  const { options, secret } = strapi.config.get('server.admin.jwt', {});

  return {
    secret,
    options: _.merge(options, defaultOptions),
  };
};

/**
 * Creates a JWT token for an administration user
 * @param {object} admon - admin user
 */
const createJwtToken = admin => {
  const { options, secret } = getJWTOptions();

  return jwt.sign(
    {
      id: admin.id,
      isAdmin: true,
    },
    secret,
    options
  );
};

/**
 * hashes a password
 * @param {string} password - password to hash
 * @returns {string} hashed password
 */
const hashPassword = password => bcrypt.hash(password, 10);

/**
 * Validate a password
 * @param {string} password
 * @param {string} hash
 * @returns {boolean} is the password valid
 */
const validatePassword = (password, hash) => bcrypt.compare(password, hash);

/**
 * Check login credentials
 * @param {Object} options
 * @param {string} options.email
 * @param {string} options.password
 */
const checkCredentials = async ({ email, password }) => {
  const user = await strapi.query('administrator', 'admin').findOne({ email });

  if (!user) {
    return [null, false, { message: 'Invalid credentials' }];
  }

  const isValid = await strapi.admin.services.auth.validatePassword(password, user.password);

  if (!isValid) {
    return [null, false, { message: 'Invalid credentials' }];
  }

  // TODO: change to isActive
  if (user.blocked === true) {
    return [null, false, { message: 'User not active' }];
  }

  return [null, user];
};

const decodeToken = token => {
  const { secret } = getJWTOptions();

  try {
    const payload = jwt.verify(token, secret);
    return { payload, isValid: true };
  } catch (err) {
    return { payloda: null, isValid: false };
  }
};

module.exports = {
  checkCredentials,
  createJwtToken,
  sanitizeUser,
  validatePassword,
  hashPassword,
  getJWTOptions,
  decodeToken,
};

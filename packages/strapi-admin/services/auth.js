const _ = require('lodash');
const bcrypt = require('bcryptjs');

const sanitizeUser = user => {
  return _.omit(user.toJSON ? user.toJSON() : user, [
    'password',
    'resetPasswordToken',
  ]);
};

/**
 * Creates a JWT token for an administration user
 * @param {object} admon - admin user
 */
const createJwtToken = admin => {
  const payload = _.pick(admin.toJSON ? admin.toJSON() : admin, ['_id', 'id']);
  return strapi.plugins['users-permissions'].services.jwt.issue({
    ...payload,
    isAdmin: true,
  });
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

module.exports = {
  createJwtToken,
  sanitizeUser,
  validatePassword,
  hashPassword,
};

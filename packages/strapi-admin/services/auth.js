'use strict';

const bcrypt = require('bcryptjs');

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
  const user = await strapi.query('user', 'admin').findOne({ email });

  if (!user || !user.password) {
    return [null, false, { message: 'Invalid credentials' }];
  }

  const isValid = await validatePassword(password, user.password);

  if (!isValid) {
    return [null, false, { message: 'Invalid credentials' }];
  }

  if (!(user.isActive === true)) {
    return [null, false, { message: 'User not active' }];
  }

  return [null, user];
};

const resetEmailTemplate = url => `
<p>We heard that you lost your password. Sorry about that!</p>

<p>But don’t worry! You can use the following link to reset your password:</p>

<p>${url}</p>

<p>Thanks.</p>`;

/**
 * Send an email to the user if it exists or do nothing
 * @param {Object} param params
 * @param {string} param.email user email for which to reset the password
 */
const forgotPassword = async ({ email } = {}) => {
  const user = await strapi.query('user', 'admin').findOne({ email, isActive: true });

  if (!user) {
    return;
  }

  const resetPasswordToken = strapi.admin.services.token.createToken();
  await strapi.admin.services.user.update({ id: user.id }, { resetPasswordToken });

  // TODO: set the final url once the front is developed
  const url = `${strapi.config.admin.url}/reset-password?code=${resetPasswordToken}`;
  const body = resetEmailTemplate(url);

  // Send an email to the admin.
  return strapi.plugins['email'].services.email
    .send({
      to: user.email,
      subject: 'Reset password',
      text: body,
      html: body,
    })
    .catch(err => {
      // log error server side but do not disclose it to the user to avoid leaking informations
      strapi.log.error(err);
    });
};

/**
 * Reset a user password
 * @param {Object} param params
 * @param {string} param.resetPasswordToken token generated to request a password reset
 * @param {string} param.password new user password
 */
const resetPassword = async ({ resetPasswordToken, password } = {}) => {
  const matchingUser = await strapi
    .query('user', 'admin')
    .findOne({ resetPasswordToken, isActive: true });

  if (!matchingUser) {
    throw strapi.errors.badRequest();
  }

  return strapi.admin.services.user.update(
    { id: matchingUser.id },
    {
      password,
      resetPasswordToken: null,
    }
  );
};

module.exports = {
  checkCredentials,
  validatePassword,
  hashPassword,
  forgotPassword,
  resetPassword,
};

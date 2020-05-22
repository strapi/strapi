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

const forgotPassword = async ({ email }) => {
  const admin = await strapi.query('user', 'admin').findOne({ email });

  // admin not found => do nothing
  if (!admin) {
    return;
  }

  // Generate random token.
  const resetPasswordToken = strapi.admin.services.token.createToken();

  await strapi.admin.services.user.update({ email }, { resetPasswordToken });

  // TODO: set the final url once the front is developed
  const url = `${strapi.config.admin.url}/reset-password?code=${resetPasswordToken}`;

  const body = resetEmailTemplate(url);

  // Send an email to the admin.
  await strapi.plugins['email'].services.email.send({
    to: admin.email,
    subject: 'Reset password',
    text: body,
    html: body,
  });
};

module.exports = {
  checkCredentials,
  validatePassword,
  hashPassword,
  forgotPassword,
};

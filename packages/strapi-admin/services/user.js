'use strict';

const _ = require('lodash');

/**
 * Remove private user fields
 * @param {Object} user - user to sanitize
 */
const sanitizeUser = user => {
  return _.omit(user, ['password', 'resetPasswordToken']);
};

module.exports = {
  sanitizeUser,
};

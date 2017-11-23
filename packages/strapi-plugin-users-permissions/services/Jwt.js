'use strict';

/**
 * Jwt.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const jwt = require('jsonwebtoken');

module.exports = {
  issue: (payload) => {
    return jwt.sign(
      _.clone(payload.toJSON()),
      process.env.JWT_SECRET || _.get(strapi, 'api.user.config.jwtSecret') || 'oursecret'
    );
  }
};

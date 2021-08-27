'use strict';

const { env } = require('../../../utils/lib');

module.exports = {
  salt: env('API_TOKEN_SALT'),
};

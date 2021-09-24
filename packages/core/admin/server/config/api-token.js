'use strict';

const { env } = require('@strapi/utils');

module.exports = {
  salt: env('API_TOKEN_SALT'),
};

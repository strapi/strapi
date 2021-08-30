'use strict';

module.exports = ({ env }) => ({
  salt: env('API_TOKEN_SALT'),
});

'use strict';

const admin = require('./admin');
const authentication = require('./authentication');
const permissions = require('./permissions');
const users = require('./users');
const roles = require('./roles');
const webhooks = require('./webhooks');
const apiTokens = require('./api-tokens');
const contentApi = require('./content-api');

module.exports = [
  ...admin,
  ...authentication,
  ...permissions,
  ...users,
  ...roles,
  ...webhooks,
  ...apiTokens,
  ...contentApi,
];

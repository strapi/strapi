'use strict';

const admin = require('./admin');
const authentication = require('./authentication');
const permissions = require('./permissions');
const users = require('./users');
const roles = require('./roles');
const webhooks = require('./webhooks');
const apiTokens = require('./api-tokens');
const license = require('./license');

module.exports = [
  ...admin,
  ...authentication,
  ...permissions,
  ...users,
  ...roles,
  ...webhooks,
  ...apiTokens,
  ...license,
];

'use strict';

const auth = require('./auth');
const user = require('./user');
const role = require('./role');
const permissions = require('./permissions');
const settings = require('./settings');
const contentmanageruser = require('./content-manager-user');

module.exports = {
  auth,
  user,
  role,
  permissions,
  settings,
  contentmanageruser,
};

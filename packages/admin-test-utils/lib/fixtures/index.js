'use strict';

const adminPermissions = require('./permissions/admin-permissions');
const cmPermissions = require('./permissions/content-manager-permissions');
const ctbPermissions = require('./permissions/content-type-builder-permissions');

const permissions = [...adminPermissions, ...cmPermissions, ...ctbPermissions];

module.exports = {
  adminPermissions,
  cmPermissions,
  ctbPermissions,
  permissions,
};

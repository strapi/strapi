'use strict';

const { getService } = require('../utils');

const sendDidInviteUser = async () => {
  const numberOfUsers = await getService('user').count();
  const numberOfRoles = await getService('role').count();
  return strapi.telemetry.send('didInviteUser', { numberOfRoles, numberOfUsers });
};

const sendDidUpdateRolePermissions = async () => {
  return strapi.telemetry.send('didUpdateRolePermissions');
};

module.exports = {
  sendDidInviteUser,
  sendDidUpdateRolePermissions,
};

'use strict';

const { getService } = require('../utils');

const sendDidInviteUser = async () => {
  const numberOfUsers = await getService('user').count();
  const numberOfRoles = await getService('role').count();
  strapi.telemetry.send('didInviteUser', { numberOfRoles, numberOfUsers });
};

const sendDidUpdateRolePermissions = async () => {
  strapi.telemetry.send('didUpdateRolePermissions');
};

module.exports = {
  sendDidInviteUser,
  sendDidUpdateRolePermissions,
};

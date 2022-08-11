'use strict';

const { getService } = require('../utils');

const sendDidInviteUser = async adminUserId => {
  const numberOfUsers = await getService('user').count();
  const numberOfRoles = await getService('role').count();
  strapi.telemetry.send(adminUserId, 'didInviteUser', { numberOfRoles, numberOfUsers });
};

const sendDidUpdateRolePermissions = async adminUserId => {
  strapi.telemetry.send(adminUserId, 'didUpdateRolePermissions');
};

const sendDidChangeInterfaceLanguage = async () => {
  const languagesInUse = await getService('user').getLanguagesInUse();
  strapi.telemetry.send('', 'didChangeInterfaceLanguage', { languagesInUse });
};

module.exports = {
  sendDidInviteUser,
  sendDidUpdateRolePermissions,
  sendDidChangeInterfaceLanguage,
};

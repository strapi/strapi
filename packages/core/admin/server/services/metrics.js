'use strict';

const { ampli } = require('@strapi/telemetry-server');
const { getService } = require('../utils');

const sendDidInviteUser = async () => {
  const numberOfUsers = await getService('user').count();
  const numberOfRoles = await getService('role').count();
  ampli.didInviteUser(
    '',
    { numberOfRoles, numberOfUsers },
    {},
    { source: 'core', send: strapi.telemetry.send }
  );
};

const sendDidUpdateRolePermissions = async () => {
  ampli.didUpdateRolePermissions('', {}, {}, { source: 'core', send: strapi.telemetry.send });
};

const sendDidChangeInterfaceLanguage = async () => {
  const languagesInUse = await getService('user').getLanguagesInUse();
  ampli.didChangeInterfaceLanguage(
    '',
    { languagesInUse },
    {},
    { source: 'core', send: strapi.telemetry.send }
  );
  // strapi.telemetry.send('didChangeInterfaceLanguage', { languagesInUse });
};

module.exports = {
  sendDidInviteUser,
  sendDidUpdateRolePermissions,
  sendDidChangeInterfaceLanguage,
};

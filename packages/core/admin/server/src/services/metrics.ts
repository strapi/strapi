import type { Core } from '@strapi/types';
import { getService } from '../utils';

const sendDidInviteUser = async () => {
  const numberOfUsers = await getService('user').count();
  const numberOfRoles = await getService('role').count();
  strapi.telemetry.send('didInviteUser', {
    groupProperties: { numberOfRoles, numberOfUsers },
  });
};

const sendDidUpdateRolePermissions = async () => {
  strapi.telemetry.send('didUpdateRolePermissions');
};

const sendDidChangeInterfaceLanguage = async () => {
  const languagesInUse = await getService('user').getLanguagesInUse();
  // This event is anonymous
  strapi.telemetry.send('didChangeInterfaceLanguage', { userProperties: { languagesInUse } });
};

const sendUpdateProjectInformation = async (strapi: Core.Strapi) => {
  const numberOfActiveAdminUsers = await getService('user').count({ isActive: true });
  const numberOfAdminUsers = await getService('user').count();

  strapi.telemetry.send('didUpdateProjectInformation', {
    groupProperties: { numberOfActiveAdminUsers, numberOfAdminUsers },
  });
};

const startCron = (strapi: Core.Strapi) => {
  strapi.cron.add({
    '0 0 0 * * *': () => sendUpdateProjectInformation(strapi),
  });
};

export default {
  sendDidInviteUser,
  sendDidUpdateRolePermissions,
  sendDidChangeInterfaceLanguage,
  sendUpdateProjectInformation,
  startCron,
};

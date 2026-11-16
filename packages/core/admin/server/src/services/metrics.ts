import type { Core } from '@strapi/types';
import { getService } from '../utils';

// Callers do not wait for this, so it must never reject: a count that fails, for example because
// the database is closing, would otherwise be an unhandled rejection
const sendDidInviteUser = async () => {
  try {
    const numberOfUsers = await getService('user').count();
    const numberOfRoles = await getService('role').count();
    strapi.telemetry.send('didInviteUser', {
      groupProperties: { numberOfRoles, numberOfUsers },
    });
  } catch {
    // Telemetry is best effort
  }
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
    sendProjectInformation: {
      task: () => sendUpdateProjectInformation(strapi),
      options: '0 0 0 * * *',
    },
  });
};

export default {
  sendDidInviteUser,
  sendDidUpdateRolePermissions,
  sendDidChangeInterfaceLanguage,
  sendUpdateProjectInformation,
  startCron,
};

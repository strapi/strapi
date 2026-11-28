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
  } catch (error) {
    // Telemetry is best effort, but a debug line keeps a broken pipeline diagnosable. The global is
    // gone if Strapi was destroyed while the query ran, and the catch must not throw either
    globalThis.strapi?.log.debug(
      `Admin telemetry not sent: ${error instanceof Error ? error.message : error}`
    );
  }
};

const sendDidUpdateRolePermissions = async () => {
  strapi.telemetry.send('didUpdateRolePermissions');
};

// Runs from the admin user lifecycle hooks, and after an update without being waited for: it must
// never reject either, or it would fail the user change or leave an unhandled rejection
const sendDidChangeInterfaceLanguage = async () => {
  try {
    const languagesInUse = await getService('user').getLanguagesInUse();
    // This event is anonymous
    strapi.telemetry.send('didChangeInterfaceLanguage', { userProperties: { languagesInUse } });
  } catch (error) {
    // Telemetry is best effort, but a debug line keeps a broken pipeline diagnosable. The global is
    // gone if Strapi was destroyed while the query ran, and the catch must not throw either
    globalThis.strapi?.log.debug(
      `Admin telemetry not sent: ${error instanceof Error ? error.message : error}`
    );
  }
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

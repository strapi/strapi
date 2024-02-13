import EE from '@strapi/strapi/dist/utils/ee';
import type { Strapi } from '@strapi/types';
import { assign } from 'lodash/fp';
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

const getProvidersListSSO = async () => {
  const { providerRegistry } = strapi.admin.services.passport;

  return providerRegistry.getAll().map(({ uid }) => uid);
}

const sendUpdateProjectInformation = async () => {
  let groupProperties = {};

  const numberOfActiveAdminUsers = await getService('user').count({ isActive: true });
  const numberOfAdminUsers = await getService('user').count();

  if (EE.features.isEnabled('sso')) {
    const SSOProviders = await getProvidersListSSO();

    groupProperties = assign(groupProperties, { SSOProviders });
  }
  
  groupProperties = assign(groupProperties, { numberOfActiveAdminUsers, numberOfAdminUsers });

  console.log(groupProperties);

  // strapi.telemetry.send('didUpdateProjectInformation', {
  //   groupProperties
  // });
};

const startCron = (strapi: Strapi) => {
  strapi.cron.add({
    '0 0 0 * * *': () => sendUpdateProjectInformation(),
  });
};

export {
  sendDidInviteUser,
  sendDidUpdateRolePermissions,
  sendDidChangeInterfaceLanguage,
  sendUpdateProjectInformation,
  getProvidersListSSO,
  startCron,
};

import EE from '@strapi/strapi/dist/utils/ee';
import type { Strapi } from '@strapi/types';
import { assign } from 'lodash/fp';
import { getService } from '../utils';
import metrics from '../../../ee/server/src/services/metrics';

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

const sendUpdateProjectInformation = async () => {
  let groupProperties = {};

  const numberOfActiveAdminUsers = await getService('user').count({ isActive: true });
  const numberOfAdminUsers = await getService('user').count();

  if (EE.features.isEnabled('sso')) {
    const SSOProviders = await metrics.getSSOProvidersList();

    groupProperties = assign(groupProperties, { SSOProviders, isSSOConfigured: SSOProviders.length !== 0 });
  }

  if (EE.features.isEnabled('cms-content-releases')) {
    const numberOfContentReleases = await strapi.entityService.count('plugin::content-releases.release');
    const numberOfPublishedContentReleases = await strapi.entityService.count('plugin::content-releases.release', { 
      filters: { $not: { releasedAt: null } }
    }); 

    groupProperties = assign(groupProperties, { numberOfContentReleases, numberOfPublishedContentReleases });
  }
  
  groupProperties = assign(groupProperties, { numberOfActiveAdminUsers, numberOfAdminUsers });

  console.log(groupProperties);

  strapi.telemetry.send('didUpdateProjectInformation', {
    groupProperties
  });
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
  startCron,
};

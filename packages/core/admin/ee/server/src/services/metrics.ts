import { assign } from 'lodash/fp';
import type { Strapi } from '@strapi/types';
import EE from '@strapi/strapi/dist/utils/ee';
import { getService } from '../utils';

const getSSOProvidersList = async () => {
  const { providerRegistry } = strapi.admin.services.passport;

  return providerRegistry.getAll().map(({ uid }: { uid: string }) => uid);
};

const sendUpdateProjectInformation = async () => {
  let groupProperties = {};

  const numberOfActiveAdminUsers = await getService('user').count({ isActive: true });
  const numberOfAdminUsers = await getService('user').count();

  if (EE.features.isEnabled('sso')) {
    const SSOProviders = await getSSOProvidersList();

    groupProperties = assign(groupProperties, {
      SSOProviders,
      isSSOConfigured: SSOProviders.length !== 0,
    });
  }

  if (EE.features.isEnabled('cms-content-releases')) {
    const numberOfContentReleases = await strapi.entityService.count(
      'plugin::content-releases.release'
    );
    const numberOfPublishedContentReleases = await strapi.entityService.count(
      'plugin::content-releases.release',
      {
        filters: { $not: { releasedAt: null } },
      }
    );

    groupProperties = assign(groupProperties, {
      numberOfContentReleases,
      numberOfPublishedContentReleases,
    });
  }

  groupProperties = assign(groupProperties, { numberOfActiveAdminUsers, numberOfAdminUsers });

  strapi.telemetry.send('didUpdateProjectInformation', {
    groupProperties,
  });
};

const startCron = (strapi: Strapi) => {
  strapi.cron.add({
    '0 0 0 * * *': () => sendUpdateProjectInformation(),
  });
};

export default { startCron, getSSOProvidersList, sendUpdateProjectInformation };

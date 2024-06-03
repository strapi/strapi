import { assign } from 'lodash/fp';
import type { Core } from '@strapi/types';
import { getService } from '../utils';

const getSSOProvidersList = async () => {
  const { providerRegistry } = strapi.service('admin::passport');

  return providerRegistry.getAll().map(({ uid }: { uid: string }) => uid);
};

const sendUpdateProjectInformation = async (strapi: Core.Strapi) => {
  let groupProperties = {};

  const numberOfActiveAdminUsers = await getService('user').count({ isActive: true });
  const numberOfAdminUsers = await getService('user').count();

  if (strapi.ee.features.isEnabled('sso')) {
    const SSOProviders = await getSSOProvidersList();

    groupProperties = assign(groupProperties, {
      SSOProviders,
      isSSOConfigured: SSOProviders.length !== 0,
    });
  }

  if (strapi.ee.features.isEnabled('cms-content-releases')) {
    const numberOfContentReleases = await strapi
      .db!.query('plugin::content-releases.release')
      .count();

    const numberOfPublishedContentReleases = await strapi
      .db!.query('plugin::content-releases.release')
      .count({
        filters: { releasedAt: { $notNull: true } },
      });

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

const startCron = (strapi: Core.Strapi) => {
  strapi.cron.add({
    '0 0 0 * * *': () => sendUpdateProjectInformation(strapi),
  });
};

export default { startCron, getSSOProvidersList, sendUpdateProjectInformation };

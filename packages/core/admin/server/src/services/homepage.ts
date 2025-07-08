import { Core } from '@strapi/types';
import uniqBy from 'lodash/uniqBy';
import { getService } from '../utils';

export const homepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const getKeyStatistics = async () => {
    const contentTypes = Object.keys(strapi.contentTypes).filter((contentTypeUid) =>
      contentTypeUid.startsWith('api::')
    );
    const countApiTokens = await getService('api-token').count();
    const countAdmins = await getService('user').count();
    const countLocales = await strapi.plugin('i18n').service('locales').count();
    const countsAssets = await strapi.plugin('upload').service('upload').count();
    const countWebhooks = await strapi.get('webhookStore').countWebhooks();
    const components = uniqBy(Object.values(strapi.components), 'category');
    const countEntries = await strapi
      .plugin('content-manager')
      .service('homepage')
      .getCountDocuments();
    const { draft, published, modified } = countEntries ?? {
      draft: 0,
      published: 0,
      modified: 0,
    };

    const totalCountEntries = draft + published + modified;

    return {
      entries: totalCountEntries,
      assets: countsAssets,
      contentTypes: contentTypes.length,
      components: components.length,
      locales: countLocales,
      admins: countAdmins,
      webhooks: countWebhooks,
      apiTokens: countApiTokens,
    };
  };

  return {
    getKeyStatistics,
  };
};

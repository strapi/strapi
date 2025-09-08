import { Core } from '@strapi/types';
import { getService } from '../utils';

const isContentTypeVisible = (model: any) =>
  model?.pluginOptions?.['content-type-builder']?.visible !== false;

export const homepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const getKeyStatistics = async () => {
    const contentTypes = Object.entries(strapi.contentTypes).filter(([, contentType]) => {
      return isContentTypeVisible(contentType);
    });

    const countApiTokens = await getService('api-token').count();
    const countAdmins = await getService('user').count();
    const countLocales = (await strapi.plugin('i18n')?.service('locales')?.count()) ?? null;
    const countsAssets = await strapi.db.query('plugin::upload.file').count();
    const countWebhooks = await strapi.db.query('strapi::webhook').count();

    const componentCategories = new Set(
      Object.values(strapi.components).map((component) => component.category)
    );
    const components = Array.from(componentCategories);

    return {
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

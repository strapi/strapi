import { factories, type Core } from '@strapi/strapi';

/**
 * What `strapi.service('api::article.article')` provides: the core service methods and a custom
 * one. Type generation registers this export (`types/generated/services.ts`).
 */
export type ServiceContract = Core.CoreAPI.Service.ContentType<'api::article.article'> & {
  findPublishedTitles(): Promise<string[]>;
};

export default factories.createCoreService('api::article.article', ({ strapi }) => ({
  async findPublishedTitles() {
    const articles = await strapi
      .documents('api::article.article')
      .findMany({ status: 'published', fields: ['title'] });

    return articles
      .map((article) => article.title)
      .filter((title): title is string => title !== null);
  },
})) satisfies Core.ServiceFactory<'api::article.article'>;

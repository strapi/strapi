// eslint-disable-next-line import/no-extraneous-dependencies
import { factories, type Core } from '@strapi/strapi';

// A core service with a custom method: the contract keeps the content-type methods.
export type ServiceContract = Core.CoreAPI.Service.ContentType<'api::article.article'> & {
  findIds(): Promise<string[]>;
};

export default factories.createCoreService('api::article.article', ({ strapi }) => ({
  async findIds() {
    const articles = await strapi.documents('api::article.article').findMany();
    return articles.map((article) => article.documentId);
  },
})) satisfies Core.ServiceFactory<'api::article.article'>;

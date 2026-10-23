import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::article.article', ({ strapi }) => ({
  async findPopular() {
    return strapi.documents('api::article.article').findMany({
      filters: { views: { $gt: 100 } },
      sort: 'views:desc',
    });
  },
}));

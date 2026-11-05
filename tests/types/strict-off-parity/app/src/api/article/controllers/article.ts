import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::article.article', ({ strapi }) => ({
  async popular(ctx) {
    ctx.body = await strapi.service('api::article.article').findPopular();
  },
}));

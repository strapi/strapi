import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::article.article', {
  config: {
    find: {
      policies: ['global::is-owner'],
      middlewares: ['global::timer'],
    },
  },
});

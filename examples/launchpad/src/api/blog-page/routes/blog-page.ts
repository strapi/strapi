/**
 * blog-page router
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::blog-page.blog-page', {
  config: {
    find: {
      middlewares: ['api::blog-page.blog-page-populate'],
    },
  },
});

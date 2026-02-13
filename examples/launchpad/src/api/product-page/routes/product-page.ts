/**
 * product-page router
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::product-page.product-page', {
  config: {
    find: {
      middlewares: ['api::product-page.product-page-populate'],
    },
  },
});

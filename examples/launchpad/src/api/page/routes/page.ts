/**
 * page router
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::page.page', {
  config: {
    find: {
      middlewares: ['api::page.page-populate'],
    },
    findOne: {
      middlewares: ['api::page.page-populate'],
    },
  },
});

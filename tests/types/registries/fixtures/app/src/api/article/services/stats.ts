import type { Core } from '@strapi/strapi';

// A contract re-exported from a file the API loader does not read. The extension keeps the import
// valid when the consumer test copies the application as an ECMAScript module.
export type { StatsContract as ServiceContract } from '../contracts.js';

export default (({ strapi }) => ({
  async total() {
    return strapi.documents('api::article.article').count({});
  },
})) satisfies Core.ServiceFactory<'api::article.stats'>;

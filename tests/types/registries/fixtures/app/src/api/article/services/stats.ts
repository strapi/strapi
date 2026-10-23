import type { Core } from '@strapi/strapi';

// A contract re-exported from a file the API loader does not read.
export type { StatsContract as ServiceContract } from '../contracts';

export default (({ strapi }) => ({
  async total() {
    return strapi.documents('api::article.article').count({});
  },
})) satisfies Core.ServiceFactory<'api::article.stats'>;

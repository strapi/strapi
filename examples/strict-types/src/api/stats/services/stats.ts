import type { Core } from '@strapi/strapi';

/** A plain factory service, without a content type. */
export type ServiceContract = {
  summary(): Promise<{ articles: number; legacy: 'pong' }>;
};

export default (({ strapi }) => ({
  async summary() {
    return {
      articles: await strapi.documents('api::article.article').count({}),
      // `api::legacy.legacy` has no contract: its type is inferred from its factory.
      legacy: strapi.service('api::legacy.legacy').ping(),
    };
  },
})) satisfies Core.ServiceFactory<'api::stats.stats'>;

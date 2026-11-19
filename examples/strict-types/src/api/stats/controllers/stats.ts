import type { Core } from '@strapi/strapi';

export type ControllerContract = {
  summary: Core.ControllerHandler<{ articles: number; legacy: 'pong' }>;
};

export default (({ strapi }) => ({
  async summary() {
    return strapi.service('api::stats.stats').summary();
  },
})) satisfies Core.ControllerFactory<'api::stats.stats'>;

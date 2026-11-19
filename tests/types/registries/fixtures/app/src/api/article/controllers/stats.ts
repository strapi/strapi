import type { Core } from '@strapi/strapi';

export type ControllerContract = {
  summary: Core.ControllerHandler<{ total: number }>;
};

export default (({ strapi }) => ({
  async summary() {
    return { total: await strapi.service('api::article.stats').total() };
  },
})) satisfies Core.ControllerFactory<'api::article.stats'>;

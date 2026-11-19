import { factories, type Core } from '@strapi/strapi';

/**
 * The core actions and a custom `titles` action, routed by `routes/custom-article.ts`.
 */
export type ControllerContract = Core.CoreAPI.Controller.ContentType<'api::article.article'> & {
  titles: Core.ControllerHandler<string[]>;
};

export default factories.createCoreController('api::article.article', ({ strapi }) => ({
  async titles() {
    // Resolves to the registered `ServiceContract`.
    return strapi.service('api::article.article').findPublishedTitles();
  },
})) satisfies Core.ControllerFactory<'api::article.article'>;

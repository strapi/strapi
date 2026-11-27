import { factories, type Core } from '@strapi/strapi';

/**
 * The core actions and the custom `titles` and `latest` actions, routed by
 * `routes/custom-article.ts`.
 */
export type ControllerContract = Core.CoreAPI.Controller.ContentType<'api::article.article'> & {
  titles: Core.ControllerHandler<string[]>;
  latest: Core.ControllerHandler;
};

export default factories.createCoreController('api::article.article', ({ strapi }) => ({
  async titles() {
    // Resolves to the registered `ServiceContract`.
    return strapi.service('api::article.article').findPublishedTitles();
  },
  // An action that returns a value computed from `this`, as `strapi generate` users write them. The
  // factory keeps `titles` and `latest`: `this` does not decide what the factory returns.
  async latest(ctx) {
    const articles = await strapi
      .documents('api::article.article')
      .findMany({ sort: { createdAt: 'desc' }, limit: 5 });

    return this.transformResponse(await this.sanitizeOutput(articles, ctx));
  },
})) satisfies Core.ControllerFactory<'api::article.article'>;

'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    // -------------------------------------------------------------------------
    // Custom Content API params: add extra query and body keys to content-api
    // routes. When api.rest.strictParams is on, only core params (and params
    // on the route's request schema) are allowed. These are merged into the
    // route schema so they are allowed and validated/sanitized with Zod.
    // Use a function (z) => schema so you don't need to import z; Strapi passes its z.
    // -------------------------------------------------------------------------

    // Custom query param: e.g. GET /api/articles?search=coffee
    // matchRoute: only add this param to routes whose path includes "articles"
    strapi.contentAPI.addQueryParams({
      search: {
        schema: (z) => z.string().max(200).optional(),
        matchRoute: (route) => route.path.includes('articles'),
      },
    });

    // Custom body param: e.g. POST /api/articles with body { title: '...', clientMutationId: 'abc-123' }
    strapi.contentAPI.addBodyParams({
      clientMutationId: {
        schema: (z) => z.string().max(100).optional(),
      },
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {},

  /**
   * An asynchronous destroy function that runs before
   * your application gets shut down.
   *
   * This gives you an opportunity to gracefully stop services you run.
   */
  destroy({ strapi }) {},
};

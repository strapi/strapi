'use strict';

/**
 * Body parser hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        strapi.koaMiddlewares.body(
          Object.assign(
            {
              patchKoa: true,
            },
            strapi.config.middleware.settings.parser
          )
        )
      );

      // add koa-qs
      strapi.koaMiddlewares.qs(strapi.app);

      cb();
    },
  };
};

'use strict';

/**
 * Body parser hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize: cb => {
      strapi.app.use(strapi.koaMiddlewares.body(Object.assign({
        patchKoa: true,
      },
      strapi.config.middleware.settings.parser
      )));

      cb();
    }
  };
};

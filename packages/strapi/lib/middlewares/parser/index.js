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
      strapi.app.use(strapi.koaMiddlewares.body(strapi.config.middleware.settings.parser));

      cb();
    }
  };
};

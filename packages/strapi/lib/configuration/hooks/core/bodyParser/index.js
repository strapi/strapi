'use strict';

/**
 * Body parser hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      parser: {
        multipart: true
      }
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      strapi.app.use(
        strapi.middlewares.convert(
          strapi.middlewares.body(strapi.config.parser)
        )
      );

      cb();
    }
  };
};

'use strict';

/**
 * Module dependencies
 */

/**
 * CRON hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      xframe: {
        enabled: true,
        value: 'SAMEORIGIN'
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        strapi.koaMiddlewares.convert(
          strapi.koaMiddlewares.lusca.xframe({
            value: strapi.config.middleware.settings.xframe.value
          })
        )
      );

      cb();
    }
  };
};

'use strict';

/**
 * Module dependencies
 */

/**
 * P3P hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      p3p: {
        enabled: false
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(strapi.middlewares.convert(strapi.middlewares.lusca.p3p({
        value: strapi.config.hook.settings.p3p.value
      })));

      cb();
    }
  };
};

'use strict';

/**
 * Module dependencies
 */

/**
 * SSL hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      ssl: {
        enabled: false,
        trustProtoHeader: false,
        trustAzureHeader: false,
        port: 443,
        ignoreUrl: false,
        temporary: false,
        skipDefaultPort: true,
        redirectMethods: ['GET', 'HEAD'],
        internalRedirectMethods: []
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(strapi.koaMiddlewares.sslify(strapi.config.middleware.settings.ssl));

      cb();
    }
  };
};

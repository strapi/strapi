'use strict';

/**
 * Module dependencies
 */
const cors = require('@koa/cors');

const defaults = {
  origin: '*',
  maxAge: 31536000,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  keepHeadersOnError: false,
};

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */
    initialize() {
      if (strapi.config.currentEnvironment.security.cors.enabled !== true)
        return;

      const {
        origin,
        expose,
        maxAge,
        credentials,
        methods,
        headers,
        keepHeadersOnError,
      } = Object.assign({}, defaults, strapi.config.middleware.settings.cors);

      strapi.app.use(
        cors({
          origin,
          exposeHeaders: expose,
          maxAge,
          credentials,
          allowMethods: methods,
          allowHeaders: headers,
          keepHeadersOnError,
        })
      );
    },
  };
};

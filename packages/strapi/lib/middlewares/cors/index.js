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
          origin: function(ctx) {
            const whitelist = Array.isArray(origin)
              ? origin
              : origin.split(/\s*,\s*/);

            const requestOrigin = ctx.accept.headers.origin;
            if (whitelist.includes('*')) {
              return '*';
            }

            if (!whitelist.includes(requestOrigin)) {
              return ctx.throw(`${requestOrigin} is not a valid origin`);
            }
            return requestOrigin;
          },
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

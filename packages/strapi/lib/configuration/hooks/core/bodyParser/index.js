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
        encode: 'utf-8',
        formLimit: '56kb',
        jsonLimit: '1mb',
        strict: true,
        extendTypes: {
          json: [
            'application/x-javascript'
          ]
        }
      }
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      strapi.app.use(strapi.middlewares.bodyparser({
        encode: strapi.config.parser.encode,
        formLimit: strapi.config.parser.formLimit,
        jsonLimit: strapi.config.parser.jsonLimit,
        strict: strapi.config.parser.strict,
        extendTypes: strapi.config.parser.extendTypes
      }));

      cb();
    }
  };
};

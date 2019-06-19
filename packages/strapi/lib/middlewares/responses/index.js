'use strict';

/**
 * Custom responses hook
 */

const _ = require('lodash');

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      strapi.app.use(async (ctx, next) => {
        await next();

        // Call custom responses.
        if (
          _.isFunction(
            _.get(strapi.config, `functions.responses.${ctx.status}`)
          )
        ) {
          await strapi.config.functions.responses[ctx.status].call(this, ctx);
        }

        // Set X-Powered-By header.
        if (
          _.get(strapi.config.currentEnvironment.response, 'poweredBy.enabled')
        ) {
          ctx.set(
            'X-Powered-By',
            _.get(
              strapi.config.currentEnvironment.response,
              'poweredBy.value',
              'Strapi <strapi.io>'
            )
          );
        }
      });
    },
  };
};

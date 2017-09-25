'use strict';

/**
 * Custom responses hook
 */

const _ = require('lodash');

module.exports = () => {
  return {
    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(async (ctx, next) => {
        await next();

        // Call custom responses.
        if (_.isFunction(_.get(strapi.config, `functions.responses.${ctx.status}`))) {
          await strapi.config.functions.responses[ctx.status].call(this, ctx);
        }

        // Set X-Powered-By header.
        if (_.get(strapi.config, 'X-Powered-By.enabled', true)) {
          ctx.set('X-Powered-By', 'Strapi <strapi.io>');
        }
      });
      cb();
    }
  };
};

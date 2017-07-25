'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * IP filter hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      ip: {
        whiteList: [],
        blackList: []
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      if (_.isPlainObject(strapi.config.middlewares.settings.ip) && !_.isEmpty(strapi.config.middlewares.settings.ip)) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.ip({
              whiteList: strapi.config.middlewares.settings.ip.whiteList,
              blackList: strapi.config.middlewares.settings.ip.blackList
            })
          )
        );
      }

      cb();
    }
  };
};

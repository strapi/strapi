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

    initialize: cb => {
      if (_.isPlainObject(strapi.config.ip) && !_.isEmpty(strapi.config.ip)) {
        strapi.app.use(strapi.middlewares.convert(strapi.middlewares.ip({
          whiteList: strapi.config.ip.whiteList,
          blackList: strapi.config.ip.blackList
        })));
      }

      cb();
    }
  };
};

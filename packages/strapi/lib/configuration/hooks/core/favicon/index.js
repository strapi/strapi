'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');

/**
 * Favicon hook
 */

module.exports = strapi => {
  return {

    /**
     * Default options
     */

    defaults: {
      favicon: {
        path: 'favicon.ico',
        maxAge: 86400000
      }
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      if (_.isPlainObject(strapi.config.favicon) && !_.isEmpty(strapi.config.favicon)) {
        strapi.app.use(strapi.middlewares.favicon(path.resolve(strapi.config.appPath, strapi.config.favicon.path), {
          maxAge: strapi.config.favicon.maxAge
        }));
      }

      cb();
    }
  };
};

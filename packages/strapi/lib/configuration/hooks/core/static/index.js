'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

/**
 * Public assets hook
 */

module.exports = strapi => {
  return {

    /**
     * Default options
     */

    defaults: {
      static: true
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      if (strapi.config.static === true) {
        strapi.app.use(strapi.middlewares.static(path.resolve(strapi.config.appPath, strapi.config.paths.static)));
      }

      cb();
    }
  };
};

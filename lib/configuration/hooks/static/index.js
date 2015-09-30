'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

/**
 * Public assets hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      static: true
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      if (strapi.config.static === true) {
        strapi.app.use(strapi.middlewares.static(path.resolve(strapi.config.appPath, strapi.config.paths.static)));
      }

      cb();
    }
  };

  return hook;
};

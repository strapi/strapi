'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');
const consolidate = require('consolidate');

/**
 * Views hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      views: false
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      if (_.isPlainObject(strapi.config.views) && !_.isEmpty(strapi.config.views)) {

        // Map every template engine in config.
        _.forEach(strapi.config.views.map, function (engine) {
          if (!consolidate.requires[engine]) {

            // Try to require them using `consolidate` or throw an error.
            try {
              consolidate.requires[engine] = require(path.resolve(strapi.config.appPath, 'node_modules', engine));
            } catch (err) {
              strapi.log.error('`' + engine + '` template engine not installed.');
              strapi.log.error('Execute `$ npm install ' + engine + ' --save` to install it.');
              process.exit(1);
            }
          }

          // Initialize the engine with `consolidate`.
          consolidate[engine];
        });

        // Finally, use the middleware.
        strapi.app.use(strapi.middlewares.views(path.resolve(strapi.config.appPath, strapi.config.paths.views), strapi.config.views));
      }

      cb();
    }
  };

  return hook;
};

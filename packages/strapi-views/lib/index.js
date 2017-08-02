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
 * Public assets hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      views: {
        enabled: false
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      if (
        _.isPlainObject(strapi.config.middleware.settings.views) &&
        !_.isEmpty(strapi.config.middleware.settings.views)
      ) {
        const opts = _.clone(strapi.config.middleware.settings.views);

        if (opts.hasOwnProperty('default')) {
          opts.extension = opts.default;
          delete opts.default;
        }

        // Map every template engine in config.
        _.forEach(opts.map, engine => {
          if (!consolidate.requires[engine]) {
            // Try to require them using `consolidate` or throw an error.
            try {
              consolidate.requires[engine] = require(path.resolve(
                strapi.config.appPath,
                'node_modules',
                engine
              ));
            } catch (err) {
              strapi.log.error(
                '`' + engine + '` template engine not installed.'
              );
              strapi.log.error(
                'Execute `$ npm install ' + engine + ' --save` to install it.'
              );
              process.exit(1);
            }
          }

          // Initialize the engine with `consolidate`.
          consolidate[engine];
        });

        strapi.app.use(
          strapi.koaMiddlewares.views(
            path.resolve(strapi.config.appPath, strapi.config.paths.views),
            opts
          )
        );
      }

      cb();
    }
  };
};

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const spawn = require('child_process').spawn;

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
    },

    /**
     * Installation template engines
     */

    installation: function () {
      const done = _.after(_.size(strapi.config.views.map), function () {
        strapi.emit('hook:views:installed');
      });

      _.forEach(strapi.config.views.map, function (engine) {
        try {
          require(path.resolve(strapi.config.appPath, 'node_modules', engine));

          done();
        } catch (err) {
          if (strapi.config.environment === 'development') {
            strapi.log.warn('Installing the `' + engine + '` template engine, please wait...');
            console.log();

            const process = spawn('npm', ['install', engine, '--save']);

            process.on('error', function (error) {
              strapi.log.error('The template engine `' + engine + '` has not been installed.');
              strapi.log.error(error);
              process.exit(1);
            });

            process.on('close', function (code) {
              if (code !== 0) {
                strapi.log.error('The template engine `' + engine + '` has not been installed.');
                strapi.log.error('Code: ' + code);
                process.exit(1);
              }

              strapi.log.info('`' + engine + '` successfully installed');
              done();
            });
          } else {
            strapi.log.error('The template engine `' + engine + '` is not installed.');
            strapi.log.error('Execute `$ npm install ' + engine + ' --save` to install it.');
            process.exit(1);
          }
        }
      });
    }
  };

  return hook;
};

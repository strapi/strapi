'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const cluster = require('cluster');

// Public node modules.
const _ = require('lodash');
const async = require('async');

/**
 * Programmatically restart the server
 * (useful for the Studio)
 */

module.exports = cb => {
  console.log();

  // Update the Strapi status (might be used
  // by the core or some hooks).
  strapi.reloading = true;

  // Async module loader to rebuild a
  // dictionary of the application.
  async.auto({

    // Rebuild the dictionaries.
    dictionaries: cb => {
      strapi.on('hook:_config:reloaded', () => {
        strapi.on('hook:_api:reloaded', () => cb());
        strapi.hooks._api.reload();
      });

      strapi.hooks._config.reload();
    }
  },

  // Callback.
  err => {
    let count = 0;

    // Just in case there is an error.
    if (err) {
      strapi.log.error('Impossible to reload the server');
      strapi.log.error('Please restart the server manually');
      strapi.stop();
    }

    // Tell the application the framework is reloading
    // (might be used by some hooks).
    strapi.reloading = true;

    // Run adapters installation
    if (cluster.isMaster) {
      strapi.hooks.waterline.installation();

      ++count;

      if (_.isPlainObject(strapi.config.views) && !_.isBoolean(strapi.config.views)) {
        strapi.hooks.views.installation();

        ++count;
      }
    }

    const installed = _.after(count, () => {
      if (_.isPlainObject(strapi.config.reload) && !_.isEmpty(strapi.config.reload) && strapi.config.reload.workers > 0) {
        strapi.log.warn('Application is restarting...');
        console.log();
      }

      // Teardown Waterline adapters and
      // reload the Waterline ORM.
      strapi.after('hook:waterline:reloaded', () => {
        strapi.after('hook:router:reloaded', () => {
          process.nextTick(() => cb());

          // Update `strapi` status.
          strapi.reloaded = true;
          strapi.reloading = false;

          // Finally inform the developer everything seems ok.
          if (cluster.isMaster && _.isPlainObject(strapi.config.reload) && !_.isEmpty(strapi.config.reload) && strapi.config.reload.workers < 1) {
            strapi.log.info('Application\'s dictionnary updated');
            strapi.log.warn('You still need to restart your server to fully enjoy changes...');
          }

          strapi.once('restart:done', function () {
            strapi.log.info('Application successfully restarted');
          });

          if (cluster.isMaster) {
            _.forEach(cluster.workers, worker => worker.on('message', () => strapi.emit('restart:done')));
          }

          // Kill every worker processes.
          _.forEach(cluster.workers, () => process.kill(process.pid, 'SIGHUP'));
        });

        // Reloading the router.
        strapi.hooks.router.reload();
      });

      // Reloading the ORM.
      strapi.hooks.waterline.reload();
    });

    strapi.after('hook:waterline:installed', () => {
      installed();
    });

    strapi.after('hook:views:installed', () => {
      installed();
    });
  });
};

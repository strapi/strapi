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

module.exports = (cb) => {

  console.log();

  // Update the Strapi status (might be used
  // by the core or some hooks).
  this.reloading = true;

  // Async module loader to rebuild a
  // dictionary of the application.
  async.auto({

    // Rebuild the dictionaries.
    dictionaries: cb => {
      this.on('hook:_config:reloaded', () => {
        this.on('hook:_api:reloaded', () => cb());
        this.hooks._api.reload();
      });

      this.hooks._config.reload();
    }
  },

  // Callback.
  err => {

    // Just in case there is an error.
    if (err) {
      this.log.error('Impossible to reload the server');
      this.log.error('Please restart the server manually');
      this.stop();
    }

    // Tell the application the framework is reloading
    // (might be used by some hooks).
    this.reloading = true;

    // Run adapters installation
    if (cluster.isMaster) {
      this.hooks.waterline.installation();
    }

    // Install new adapters
    strapi.after('hook:waterline:installed', () => {
      this.log.warn('Application is restarting...');
      console.log();

      // Teardown Waterline adapters and
      // reload the Waterline ORM.
      this.after('hook:waterline:reloaded', () => {
        this.after('hook:router:reloaded', () => {
          process.nextTick(() => cb());

          // Update `strapi` status.
          this.reloaded = true;
          this.reloading = false;

          // Finally inform the developer everything seems ok.
          if (cluster.isMaster && _.isPlainObject(strapi.config.reload) && !_.isEmpty(strapi.config.reload) && strapi.config.reload.workers < 1) {
            this.log.info('Application\'s dictionnary updated');
            this.log.warn('You still need to restart your server to fully enjoy changes...');
          }

          this.once('restart:done', function () {
            strapi.log.info('Application successfully restarted');
          });

          if (cluster.isMaster) {
            _.forEach(cluster.workers, (worker) => worker.on('message', () => self.emit('restart:done')));
          }

          // Kill every worker processes.
          _.forEach(cluster.workers, () => process.kill(process.pid, 'SIGHUP'));
        });

        // Reloading the router.
        this.hooks.router.reload();
      });

      // Reloading the ORM.
      this.hooks.waterline.reload();
    });
  });
};

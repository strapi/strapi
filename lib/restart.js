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

        // Kill every worker processes.
        _.forEach(cluster.workers, () => process.kill(process.pid, 'SIGHUP'));

        if (cluster.isMaster && _.isPlainObject(strapi.config.reload) && !_.isEmpty(strapi.config.reload) && strapi.config.reload.workers > 0) {
          this.log.info('Application restarted');
          console.log();
        }
      });

      // Reloading the router.
      this.hooks.router.reload();
    });

    // Reloading the ORM.
    this.hooks.waterline.reload();
  });
};

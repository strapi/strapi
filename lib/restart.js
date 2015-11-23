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

module.exports = function (cb) {
  const self = this;

  console.log();

  // Update the Strapi status (might be used
  // by the core or some hooks).
  self.reloading = true;

  // Async module loader to rebuild a
  // dictionary of the application.
  async.auto({

    // Rebuild the dictionaries.
    dictionaries: function (cb) {
      self.on('hook:_config:reloaded', function () {
        self.on('hook:_api:reloaded', function () {
          cb();
        });

        self.hooks._api.reload();
      });

      self.hooks._config.reload();
    }
  },

  // Callback.
  function (err) {

    // Just in case there is an error.
    if (err) {
      self.log.error('Impossible to reload the server');
      self.log.error('Please restart the server manually');
      self.stop();
    }

    // Tell the application the framework is reloading
    // (might be used by some hooks).
    self.reloading = true;

    self.log.warn('Application is restarting...');
    console.log();

    // Teardown Waterline adapters and
    // reload the Waterline ORM.
    self.after('hook:waterline:reloaded', function () {
      self.after('hook:router:reloaded', function () {
        process.nextTick(function () {
          cb();
        });

        // Update `strapi` status.
        self.reloaded = true;
        self.reloading = false;

        // Finally inform the developer everything seems ok.
        if (cluster.isMaster && _.isPlainObject(strapi.config.reload) && !_.isEmpty(strapi.config.reload) && strapi.config.reload.workers < 1) {
          self.log.info('Application\'s dictionnary updated');
          self.log.warn('You still need to restart your server to fully enjoy changes...');
        }

        self.once('restart:done', function () {
          strapi.log.info('Application successfully restarted');
        });

        if (cluster.isMaster) {
          _.forEach(cluster.workers, function (worker) {
            worker.on('message', function () {
              self.emit('restart:done');
            });
          });
        }

        // Kill every worker processes.
        _.forEach(cluster.workers, function () {
          process.kill(process.pid, 'SIGHUP');
        });
      });

      // Reloading the router.
      self.hooks.router.reload();
    });

    // Reloading the ORM.
    self.hooks.waterline.reload();
  });
};

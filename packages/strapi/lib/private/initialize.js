'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const cluster = require('cluster');

/**
 * `strapi.prototype.initialize()`
 *
 * Start the Strapi server
 * NOTE: `strapi.load()` should be run first.
 *
 * @api private
 */

module.exports = function initialize(cb) {
  const self = this;

  // Callback is optional.
  cb = cb || function (err) {
    if (err) {
      self.log.error(err);
    }
  };

  // If we are in a master process.
  if (cluster.isMaster) {

    // Handle `SIGUSR2` events.
    process.once('SIGUSR2', function () {
      self.stop(function () {
        process.kill(process.pid, 'SIGUSR2');
      });
    });

    // Handle `SIGINT` events.
    process.on('SIGINT', function () {
      self.stop(process.exit);
    });

    // Handle `SIGTERM` events.
    process.on('SIGTERM', function () {
      self.stop(process.exit);
    });

    // Handle `exit` events.
    process.on('exit', function () {
      if (!self._exiting) {
        self.stop();
      }
    });

    // Make sure the configured port is not already used
    // by an application or a service.
    process.on('uncaughtException', function (err) {
      if (err.errno === 'EADDRINUSE') {
        self.log.error('Port ' + self.config.port + ' already in use.');
        self.stop();
      }
    });

    _.forEach(cluster.workers, function (worker) {
      worker.on('message', function () {
        self.emit('bootstrap:done');
      });
    });
  }

  // Only run the application bootstrap on master cluster if we don't have any workers.
  // Else, run the bootstrap logic on the workers.
  if ((!strapi.config.reload && cluster.isMaster) || ((cluster.isWorker && strapi.config.reload.workers > 0) || (cluster.isMaster && strapi.config.reload.workers < 1))) {
    self.runBootstrap(function afterBootstrap(err) {
      if (err) {
        self.log.error('Bootstrap encountered an error.');
        return cb(self.log.error(err));
      }

      if (cluster.isWorker) {
        process.send('message');
      } else {
        self.emit('bootstrap:done');
      }
    });
  }

  // And fire the `ready` event.
  // This is listened to by attached servers, etc.
  self.emit('ready');
  cb(null, self);
};

'use strict';

/**
 * Module dependencies
 */

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

  // Handle `SIGUSR2` events.
  process.once('SIGUSR2', () => {
    self.stop(() => {
      process.kill(process.pid, 'SIGUSR2');
    });
  });

  // Handle `SIGINT` events.
  process.on('SIGINT', () => {
    self.stop(process.exit);
  });

  // Handle `SIGTERM` events.
  process.on('SIGTERM', () => {
    self.stop(process.exit);
  });

  // Handle `exit` events.
  process.on('exit', () => {
    if (!self._exiting) {
      self.stop();
    }
  });

  // Make sure the configured port is not already used
  // by an application or a service.
  process.on('uncaughtException', err => {
    if (err.errno === 'EADDRINUSE') {
      self.log.error('Port ' + self.config.port + ' already in use.');
      self.stop();
    }
  });

  self.runBootstrap(err => {
    if (err) {
      self.log.error('Bootstrap encountered an error.');
      return cb(self.log.error(err));
    }

    self.emit('bootstrap:done');
  });

  // And fire the `ready` event.
  // This is listened to by attached servers, etc.
  self.emit('ready');
  cb(null, self);
};

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const cluster = require('cluster');

// Public node modules.
const async = require('async');

/**
 * `Strapi.prototype.start()`
 *
 * Loads the application, then starts all attached servers.
 *
 * @api public
 */

module.exports = function start(configOverride, cb) {
  const self = this;

  // Callback is optional.
  cb = cb || function (err) {
    if (err) {
      return self.log.error(err);
    }
  };

  async.series([
    cb => self.load(configOverride, cb),
    this.initialize
  ],

  function strapiReady(err) {
    if (err) {
      return self.stop(function (errorStoppingStrapi) {
        if (errorStoppingStrapi) {
          self.log.error('When trying to stop the application as a result of a failed start');
          self.log.error(errorStoppingStrapi);
        }
        cb(err);
      });
    }

    // Log some server info.
    if (cluster.isMaster) {
      self.log.info('Server started in ' + self.config.appPath);
      self.log.info('Your server is running at ' + self.config.url);

      if (!self.config.dry) {
        self.log.info('Your admin panel is available at ' + self.config.url + '/admin/');
      }

      self.log.debug('Time: ' + new Date());
      self.log.debug('Environment: ' + self.config.environment);
      self.log.debug('Process PID: ' + process.pid);
      self.log.debug('Cluster: master');
      self.log.info('To shut down your server, press <CTRL> + C at any time');
    } else {
      self.log.warn('New worker starting...');
      self.log.debug('Process PID: ' + process.pid);
      self.log.debug('Cluster: worker #' + cluster.worker.id);
    }

    // Blank log to give some space.
    console.log();

    // Emit an event when Strapi has started.
    self.emit('started');
    self.started = true;
    return cb(null, self);
  });
};

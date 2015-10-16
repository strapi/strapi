'use strict';

/**
 * Module dependencies
 */

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
    function (cb) {
      self.load(configOverride, cb);
    },
    self.initialize
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
    self.log.info('Server started in ' + self.config.appPath);
    self.log.info('Your server is running at ' + self.config.url);
    self.log.info('Time: ' + new Date());
    self.log.info('Environment: ' + self.config.environment);
    self.log.info('Process PID: ' + process.pid);
    self.log.info('To shut down your server, press <CTRL> + C at any time');
    console.log();

    // Emit an event when Strapi has started.
    self.emit('started');
    self.started = true;
    return cb(null, self);
  });
};

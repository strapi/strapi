'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const async = require('async');

// Local Strapi dependencies.
const packageJSON = require('../package.json');

/**
 * `Strapi.prototype.start()`
 *
 * Loads the application, then starts all attached servers.
 *
 * @api public
 */

module.exports = function start(cb) {
  // Callback is optional.
  cb = cb || function (err) {
    if (err) {
      return this.log.error(err);
    }
  };

  const scope = {
    rootPath: process.cwd(),
    strapiPackageJSON: packageJSON
  };

  async.series([
    cb => this.load(scope, cb),
    cb => this.initialize(cb)
  ], err => {
    if (err) {
      return this.stop(function (errorStoppingStrapi) {
        if (errorStoppingStrapi) {
          this.log.error('When trying to stop the application as a result of a failed start');
          this.log.error(errorStoppingStrapi);
        }
        cb(err);
      });
    }

    // Log some server info.
    this.log.info('Server started in ' + this.config.appPath);
    this.log.info('Your server is running at ' + this.config.url);
    this.log.debug('Time: ' + new Date());
    this.log.debug('Launched in: ' + (Date.now() - global.startedAt) + ' milliseconds');
    this.log.debug('Environment: ' + this.config.environment);
    this.log.debug('Process PID: ' + process.pid);
    this.log.info('To shut down your server, press <CTRL> + C at any time');

    // Blank log to give some space.
    console.log();

    // Emit an event when Strapi has started.
    this.emit('started');
    this.started = true;
    return cb(null, this);
  });
};

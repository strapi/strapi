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
    cb => self.load(configOverride, cb),
    this.initialize
  ]);
};

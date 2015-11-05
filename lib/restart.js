'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const cluster = require('cluster');

// Public node modules.
const _ = require('lodash');

/**
 * Programmatically restart the server
 * (useful for the Studio)
 */

module.exports = function () {
  _.forEach(cluster.worker, function () {
    process.kill(process.pid, 'SIGHUP');
  });
};

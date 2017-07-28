'use strict';

/**
 * `Strapi.prototype.reload()`
 *
 * This function reload workers
 *
 * It's define in strapi--start.js.
 *
 * @api public
 */

 // Node.js core.
 const path = require('path');
 const cluster = require('cluster');

 // Logger.
 const { logger, cli } = require('strapi-utils');

module.exports = function reload() {
  try {
    // Require server configurations
    const server = require(path.resolve(
      process.cwd(),
      'config',
      'environments',
      'development',
      'server.json'
    ));

    const reload = function() {
      if (cluster.isWorker && process.env.NODE_ENV === 'development' && server.reload === true) process.send('message');
    };

    reload.isReloading = false;
    reload.isWatching = true;

    return reload;
  } catch (e) {
    logger.error(e);
    process.exit(0);
  }
};

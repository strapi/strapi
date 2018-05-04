// Node.js core.
const REPL = require('repl');
const cluster = require('cluster');
const path = require('path');

// Public node modules.
const _ = require('lodash');
const { logger } = require('strapi-utils');

module.exports = function () {
  try {
    // Now load up the Strapi framework for real.
    const strapi = function () {
      try {
        return require(path.resolve(process.cwd(), 'node_modules', 'strapi'));
      } catch (e) {
        return require('strapi'); // eslint-disable-line import/no-unresolved
      }
    }();

    // Only log if the process is a master.
    if (cluster.isMaster) {
      strapi.log.info('Starting the application in interactive mode...');
    }

    strapi.start({}, function (err) {

      // Log and exit the REPL in case there is an error
      // while we were trying to start the server.
      if (err) {
        strapi.log.error('Could not load the Strapi framework.');
        strapi.log.error('Are you using the latest stable version?');
        process.exit(1);
      }

      // Open the Node.js REPL.
      if ((cluster.isMaster && _.isEmpty(cluster.workers)) || cluster.worker.id === 1) {
        const repl = REPL.start(strapi.config.info.name + ' > ' || 'strapi > '); // eslint-disable-line prefer-template

        repl.on('exit', function (err) {

          // Log and exit the REPL in case there is an error
          // while we were trying to open the REPL.
          if (err) {
            strapi.log.error(err);
            process.exit(1);
          }

          strapi.stop();
        });
      }
    });
  } catch (e) {
    logger.error(e);
  }
};

// Node.js core.
const REPL = require('repl');
const cluster = require('cluster');
const strapi = require('../lib');

// Public node modules.
const _ = require('lodash');
const { logger } = require('strapi-utils');

module.exports = function() {
  try {
    // Now load up the Strapi framework for real.
    const app = strapi();
    // Only log if the process is a master.
    if (cluster.isMaster) {
      app.log.info('Starting the application in interactive mode...');
    }

    app.start({}, function(err) {
      // Log and exit the REPL in case there is an error
      // while we were trying to start the server.
      if (err) {
        app.log.error('Could not load the Strapi framework.');
        app.log.error('Are you using the latest stable version?');
        process.exit(1);
      }

      // Open the Node.js REPL.
      if (
        (cluster.isMaster && _.isEmpty(cluster.workers)) ||
        cluster.worker.id === 1
      ) {
        const repl = REPL.start(app.config.info.name + ' > ' || 'strapi > '); // eslint-disable-line prefer-template

        repl.on('exit', function(err) {
          // Log and exit the REPL in case there is an error
          // while we were trying to open the REPL.
          if (err) {
            app.log.error(err);
            process.exit(1);
          }

          app.stop();
        });
      }
    });
  } catch (e) {
    logger.error(e);
  }
};

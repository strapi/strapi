#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const cp = require('child_process');
const path = require('path');
const cluster = require('cluster');

// Public dependencies
const _ = require('lodash');
const fs = require('fs');
const semver = require('semver')

// Logger.
const { cli, logger } = require('strapi-utils');

/**
 * `$ strapi start`
 *
 * Expose method which starts the appropriate instance of Strapi
 * (fire up the application in our working directory).
 */

module.exports = function() {
  try {
    const strapi = function () {
      try {
        return require(path.resolve(process.cwd(), 'node_modules', 'strapi'));
      } catch (e) {
        return require('strapi');
      }
    }();

    // Set NODE_ENV
    if (_.isEmpty(process.env.NODE_ENV)) {
      process.env.NODE_ENV = 'development';
    }

    // Require server configurations
    const server = require(path.resolve(
      process.cwd(),
      'config',
      'environments',
      'development',
      'server.json'
    ));

    if (process.env.NODE_ENV === 'development' && _.get(server, 'autoReload.enabled') === true) {
      const restart = path => {
        if (strapi.reload.isWatching && cluster.isWorker && !strapi.reload.isReloading) {
          strapi.reload.isReloading = true;
          strapi.log.info(`File changed: ${path}`);
          strapi.reload();
        }
      };

      const setFilesToWatch = (src) => {
        var files = fs.readdirSync(src);
        _.forEach(files, file => {
          if (_.startsWith(file, '.') || file === 'node_modules') return;

          const filePath = `${src}/${file}`;
          if (fs.statSync(filePath).isDirectory()) setFilesToWatch(filePath);
          else fs.watchFile(filePath, (evt, path) => restart(filePath));
        });
      };

      setFilesToWatch(process.cwd());



      if (cluster.isMaster) {
        cluster.on('message', (worker, message) => {
          switch (message) {
            case 'reload':
              strapi.log.info('The server is restarting\n');

              _.forEach(cluster.workers, worker => worker.send('isKilled'));
              break;
            case 'kill':
              _.forEach(cluster.workers, worker => worker.kill());

              cluster.fork();
              break;
            case 'stop':
              _.forEach(cluster.workers, worker => worker.kill());

              process.exit(0);
              break;
            default:
              return;
          }
        });

        cluster.fork();
      }

      if (cluster.isWorker) {
        process.on('message', (message) => {
          switch (message) {
            case 'isKilled':
              strapi.server.destroy(() => {
                process.send('kill');
              });
              break;
            default:
             // Do nothing.
          }
        });

        return strapi.start(afterwards);
      } else {
        return;
      }
    }

    // Otherwise, if no workable local `strapi` module exists,
    // run the application using the currently running version
    // of `strapi`. This is probably always the global install.
    strapi.start(afterwards);
  } catch (e) {
    logger.error(e);
    process.exit(0);
  }
};

function afterwards(err, strapi) {
  if (err) {
    logger.error(err.stack ? err.stack : err);

    strapi ? strapi.stop() : process.exit(1);
  }
}

#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const cluster = require('cluster');

// Public dependencies
const fs = require('fs');
const _ = require('lodash');
const { cyan } = require('chalk');

// Logger.
const { cli, logger } = require('strapi-utils');

/**
 * `$ strapi start`
 *
 * Expose method which starts the appropriate instance of Strapi
 * (fire up the application in our working directory).
 */

module.exports = function(appPath = '') {
  // Check that we're in a valid Strapi project.
  if (!cli.isStrapiApp()) {
    return console.log(`⛔️ ${cyan('strapi start')} can only be used inside a Strapi project.`);
  }

  appPath = path.join(process.cwd(), appPath);

  try {
    const strapi = function () {
      try {
        return require(path.resolve(appPath, 'node_modules', 'strapi'));
      } catch (e) {
        return require('strapi'); // eslint-disable-line import/no-unresolved
      }
    }();

    // Set NODE_ENV
    if (_.isEmpty(process.env.NODE_ENV)) {
      process.env.NODE_ENV = 'development';
    }

    // Require server configurations
    const server = require(path.resolve(
      appPath,
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
        let files = _.includes(src, '/admin') || _.includes(src, 'components') ? [] : fs.readdirSync(src);

        _.forEach(files, file => {
          if (
            _.startsWith(file, '.') ||
            file === 'node_modules' ||
            file === 'plugins.json' ||
            file === 'index.html'   ||
            file === 'public'       ||
            file === 'cypress'
          ) {
            return;
          }

          const filePath = `${src}/${file}`;
          if (fs.statSync(filePath).isDirectory()) setFilesToWatch(filePath);
          else fs.watchFile(filePath, () => restart(filePath));
        });
      };

      setFilesToWatch(appPath);

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

        return strapi.start({
          appPath
        }, afterwards);
      } else {
        return;
      }
    }

    // Otherwise, if no workable local `strapi` module exists,
    // run the application using the currently running version
    // of `strapi`. This is probably always the global install.
    strapi.start({
      appPath
    }, afterwards);
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

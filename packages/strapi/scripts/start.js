#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const cluster = require('cluster');
const strapi = require('../lib');

// Public dependencies
const _ = require('lodash');
const { cyan } = require('chalk');
const chokidar = require('chokidar');

// Logger.
const { cli, logger } = require('strapi-utils');

/**
 * Init file watching to auto restart strapi app
 * @param {Object} options - Options object
 * @param {string} options.appPath - This is the path where the app is located, the watcher will watch the files under this folder
 * @param {Strapi} options.strapi - Strapi instance
 */
const watchFileChanges = ({ appPath, strapiInstance }) => {
  const restart = () => {
    if (
      strapiInstance.reload.isWatching &&
      !strapiInstance.reload.isReloading
    ) {
      strapiInstance.reload.isReloading = true;
      strapiInstance.reload();
    }
  };

  const watcher = chokidar.watch(appPath, {
    ignoreInitial: true,
    ignored: [
      /(^|[/\\])\../,
      /tmp/,
      '**/admin',
      '**/admin/**',
      '**/components',
      '**/components/**',
      '**/documentation',
      '**/documentation/**',
      '**/node_modules',
      '**/node_modules/**',
      '**/plugins.json',
      '**/index.html',
      '**/public',
      '**/public/**',
      '**/cypress',
      '**/cypress/**',
      '**/*.db*',
      '**/exports/**',
    ],
  });

  watcher
    .on('add', path => {
      strapiInstance.log.info(`File created: ${path}`);
      restart();
    })
    .on('change', path => {
      strapiInstance.log.info(`File changed: ${path}`);
      restart();
    })
    .on('unlink', path => {
      strapiInstance.log.info(`File deleted: ${path}`);
      restart();
    });
};

/**
 * `$ strapi start`
 *
 * Expose method which starts the appropriate instance of Strapi
 * (fire up the application in our working directory).
 */

module.exports = function(appPath = '') {
  // Check that we're in a valid Strapi project.
  if (!cli.isStrapiApp()) {
    return console.log(
      `⛔️ ${cyan('strapi start')} can only be used inside a Strapi project.`
    );
  }

  appPath = path.join(process.cwd(), appPath);

  try {
    const strapiInstance = strapi({ appPath });

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

    if (
      process.env.NODE_ENV === 'development' &&
      _.get(server, 'autoReload.enabled') === true
    ) {
      if (cluster.isMaster) {
        cluster.on('message', (worker, message) => {
          switch (message) {
            case 'reload':
              strapiInstance.log.info('The server is restarting\n');
              worker.send('isKilled');
              break;
            case 'kill':
              worker.kill();
              cluster.fork();
              break;
            case 'stop':
              worker.kill();
              process.exit(1);
              break;
            default:
              return;
          }
        });

        cluster.fork();
      }

      if (cluster.isWorker) {
        watchFileChanges({ appPath, strapiInstance });

        process.on('message', message => {
          switch (message) {
            case 'isKilled':
              strapiInstance.server.destroy(() => {
                process.send('kill');
              });
              break;
            default:
            // Do nothing.
          }
        });

        return strapiInstance.start(afterwards);
      } else {
        return;
      }
    }

    // Otherwise, if no workable local `strapiInstance` module exists,
    // run the application using the currently running version
    // of `strapiInstance`. This is probably always the global install.
    strapiInstance.start(
      {
        appPath,
      },
      afterwards
    );
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
};

function afterwards(err, strapiInstance) {
  if (err) {
    logger.error(err.stack ? err.stack : err);

    strapiInstance ? strapiInstance.stop() : process.exit(1);
  }
}

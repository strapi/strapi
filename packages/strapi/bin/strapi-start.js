#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const cluster = require('cluster');

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
const watchFileChanges = ({ appPath, strapi }) => {
  const restart = () => {
    if (strapi.reload.isWatching && !strapi.reload.isReloading) {
      strapi.reload.isReloading = true;
      strapi.reload();
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
      '**/generated/schema.graphql'
    ],
  });

  watcher
    .on('add', path => {
      strapi.log.info(`File created: ${path}`);
      restart();
    })
    .on('change', path => {
      strapi.log.info(`File changed: ${path}`);
      restart();
    })
    .on('unlink', path => {
      strapi.log.info(`File deleted: ${path}`);
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
    return console.log(`⛔️ ${cyan('strapi start')} can only be used inside a Strapi project.`);
  }

  appPath = path.join(process.cwd(), appPath);

  try {
    const strapi = (function() {
      try {
        return require(path.resolve(appPath, 'node_modules', 'strapi'));
      } catch (e) {
        return require('strapi'); // eslint-disable-line import/no-unresolved
      }
    })();

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
      if (cluster.isMaster) {
        cluster.on('message', (worker, message) => {
          switch (message) {
            case 'reload':
              strapi.log.info('The server is restarting\n');
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
        watchFileChanges({ appPath, strapi });

        process.on('message', message => {
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

        return strapi.start(
          {
            appPath,
          },
          afterwards
        );
      } else {
        return;
      }
    }

    // Otherwise, if no workable local `strapi` module exists,
    // run the application using the currently running version
    // of `strapi`. This is probably always the global install.
    strapi.start(
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

function afterwards(err, strapi) {
  if (err) {
    logger.error(err.stack ? err.stack : err);

    strapi ? strapi.stop() : process.exit(1);
  }
}

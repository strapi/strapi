#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const cluster = require('cluster');
const strapi = require('../index');

// Public dependencies
const _ = require('lodash');
const fs = require('fs-extra');
const { cyan } = require('chalk');
const chokidar = require('chokidar');
const execa = require('execa');
const loadConfigFile = require('../load/load-config-files');

// Logger.
const { cli, logger } = require('strapi-utils');

/**
 * `$ strapi develop`
 *
 * Expose method which starts the appropriate instance of Strapi
 * (fire up the application in our working directory).
 */

module.exports = async function({ build }) {
  // Check that we're in a valid Strapi project.
  if (!cli.isStrapiApp()) {
    return console.log(
      `⛔️ ${cyan('strapi start')} can only be used inside a Strapi project.`
    );
  }

  const dir = process.cwd();

  if (build && !fs.existsSync(path.join(dir, 'build'))) {
    console.log(`> No ${cyan('build')} dir found. Starting build`);
    try {
      execa.shellSync('npm run -s build', {
        stdio: 'inherit',
      });
    } catch (err) {
      process.exit(1);
    }
  }

  try {
    const strapiInstance = strapi({ appPath: dir, autoReload: true });

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
      watchFileChanges({ appPath: dir, strapiInstance });

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

      return strapiInstance.start();
    }
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
};

/**
 * Init file watching to auto restart strapi app
 * @param {Object} options - Options object
 * @param {string} options.appPath - This is the path where the app is located, the watcher will watch the files under this folder
 * @param {Strapi} options.strapi - Strapi instance
 */
function watchFileChanges({ appPath, strapiInstance }) {
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
}

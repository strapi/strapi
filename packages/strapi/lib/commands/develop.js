'use strict';

const _ = require('lodash');
const path = require('path');
const cluster = require('cluster');
const fs = require('fs-extra');
const chokidar = require('chokidar');
const execa = require('execa');

const { logger } = require('strapi-utils');
const loadConfigFile = require('../load/load-config-files');

const strapi = require('../index');

/**
 * `$ strapi develop`
 *
 */
module.exports = async function({ build, watchAdmin }) {
  const dir = process.cwd();
  const envConfigDir = path.join(dir, 'config', 'environments', 'development');
  const serverConfig = await loadConfigFile(envConfigDir, 'server.+(js|json)');
  const adminWatchIgnoreFiles = _.get(
    serverConfig,
    'admin.watchIgnoreFiles',
    []
  );

  // Don't run the build process if the admin is in watch mode
  if (build && !watchAdmin && !fs.existsSync(path.join(dir, 'build'))) {
    try {
      execa.shellSync('npm run -s build -- --no-optimization', {
        stdio: 'inherit',
      });
    } catch (err) {
      process.exit(1);
    }
  }

  try {
    const strapiInstance = strapi({
      dir,
      autoReload: true,
      serveAdminPanel: watchAdmin ? false : true,
    });

    if (cluster.isMaster) {
      //  Start the front-end dev server
      if (watchAdmin) {
        try {
          execa('npm', ['run', '-s', 'strapi', 'watch-admin'], {
            stdio: 'inherit',
          });
        } catch (err) {
          process.exit(1);
        }
      }

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
      watchFileChanges({
        dir,
        strapiInstance,
        watchIgnoreFiles: adminWatchIgnoreFiles,
      });

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
 * @param {string} options.dir - This is the path where the app is located, the watcher will watch the files under this folder
 * @param {Strapi} options.strapi - Strapi instance
 * @param {array} options.watchIgnoreFiles - Array of custom file paths that should not be watched
 */
function watchFileChanges({ dir, strapiInstance, watchIgnoreFiles }) {
  const restart = () => {
    if (
      strapiInstance.reload.isWatching &&
      !strapiInstance.reload.isReloading
    ) {
      strapiInstance.reload.isReloading = true;
      strapiInstance.reload();
    }
  };

  const watcher = chokidar.watch(dir, {
    ignoreInitial: true,
    ignored: [
      /(^|[/\\])\../, // dot files
      /tmp/,
      '**/admin',
      '**/admin/**',
      'extensions/**/admin',
      'extensions/**/admin/**',
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
      ...watchIgnoreFiles,
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

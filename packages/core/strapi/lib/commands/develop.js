'use strict';

const path = require('path');
const cluster = require('cluster');
const fs = require('fs-extra');
const chokidar = require('chokidar');
const execa = require('execa');
const { getOr } = require('lodash/fp');
const { joinBy } = require('@strapi/utils');

const loadConfiguration = require('../core/app-configuration');
const strapi = require('../index');
const tsUtils = require('../utils/typescript');
const { buildTypeScript, buildAdmin } = require('./builders');

/**
 * `$ strapi develop`
 *
 */
module.exports = async function({ build, watchAdmin, polling, browser }) {
  let dir = process.cwd();

  if (tsUtils.isTypeScriptProject(dir)) {
    dir = path.join(dir, 'dist');
  }

  try {
    if (cluster.isMaster || cluster.isPrimary) {
      return primaryProcess({ dir, build, browser });
    }

    if (cluster.isWorker) {
      return workerProcess({ dir, watchAdmin, polling });
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

const primaryProcess = async ({ dir, build, watchAdmin, browser }) => {
  const currentDirectory = process.cwd();

  if (tsUtils.isTypeScriptProject(currentDirectory)) {
    await buildTypeScript({ srcDir: currentDirectory, watch: true });
  }

  const config = loadConfiguration(dir);
  const serveAdminPanel = getOr(true, 'admin.serveAdminPanel')(config);

  const buildExists = fs.existsSync(path.join(dir, 'build'));

  // Don't run the build process if the admin is in watch mode
  if (build && !watchAdmin && serveAdminPanel && !buildExists) {
    try {
      await buildAdmin({ dir, optimization: false, forceBuild: false });
    } catch (err) {
      process.exit(1);
    }
  }

  if (watchAdmin) {
    try {
      execa('npm', ['run', '-s', 'strapi', 'watch-admin', '--', '--browser', browser], {
        stdio: 'inherit',
      });
    } catch (err) {
      process.exit(1);
    }
  }

  cluster.on('message', (worker, message) => {
    switch (message) {
      case 'reload':
        console.info('The server is restarting\n');
        worker.send('kill');
        break;
      case 'killed':
        cluster.fork();
        break;
      case 'stop':
        process.exit(1);
      default:
        return;
    }
  });

  cluster.fork();
};

const workerProcess = ({ dir, watchAdmin, polling }) => {
  const strapiInstance = strapi({
    dir,
    autoReload: true,
    serveAdminPanel: watchAdmin ? false : true,
  });

  const adminWatchIgnoreFiles = strapiInstance.config.get('admin.watchIgnoreFiles', []);
  watchFileChanges({
    dir,
    strapiInstance,
    watchIgnoreFiles: adminWatchIgnoreFiles,
    polling,
  });

  process.on('message', async message => {
    switch (message) {
      case 'kill':
        await strapiInstance.destroy();
        process.send('killed');
        process.exit();
      default:
      // Do nothing.
    }
  });

  return strapiInstance.start();
};

/**
 * Init file watching to auto restart strapi app
 * @param {Object} options - Options object
 * @param {string} options.dir - This is the path where the app is located, the watcher will watch the files under this folder
 * @param {Strapi} options.strapi - Strapi instance
 * @param {array} options.watchIgnoreFiles - Array of custom file paths that should not be watched
 */
function watchFileChanges({ dir, strapiInstance, watchIgnoreFiles, polling }) {
  const restart = () => {
    if (strapiInstance.reload.isWatching && !strapiInstance.reload.isReloading) {
      strapiInstance.reload.isReloading = true;
      strapiInstance.reload();
    }
  };

  const watcher = chokidar.watch(dir, {
    ignoreInitial: true,
    usePolling: polling,
    ignored: [
      /(^|[/\\])\../, // dot files
      /tmp/,
      '**/src/admin/**',
      '**/src/plugins/**/admin/**',
      '**/documentation',
      '**/documentation/**',
      '**/node_modules',
      '**/node_modules/**',
      '**/plugins.json',
      '**/build',
      '**/build/**',
      '**/index.html',
      '**/public',
      '**/public/**',
      strapiInstance.dirs.public,
      joinBy('/', strapiInstance.dirs.public, '**'),
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

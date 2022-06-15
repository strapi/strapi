'use strict';

const path = require('path');
const cluster = require('cluster');
const fs = require('fs-extra');
const chokidar = require('chokidar');
const execa = require('execa');
const { getOr } = require('lodash/fp');
const { joinBy } = require('@strapi/utils');
const tsUtils = require('@strapi/typescript-utils');

const loadConfiguration = require('../core/app-configuration');
const strapi = require('../index');
const { buildTypeScript, buildAdmin } = require('./builders');

/**
 * `$ strapi develop`
 *
 */

module.exports = async function ({ build, watchAdmin, polling, browser }) {
  const appDir = process.cwd();

  const isTSProject = await tsUtils.isUsingTypeScript(appDir);
  const outDir = await tsUtils.resolveOutDir(appDir);
  const distDir = isTSProject ? outDir : appDir;

  try {
    if (cluster.isMaster || cluster.isPrimary) {
      return primaryProcess({
        distDir,
        appDir,
        build,
        browser,
        isTSProject,
        watchAdmin,
      });
    }

    if (cluster.isWorker) {
      return workerProcess({ appDir, distDir, watchAdmin, polling, isTSProject });
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

const primaryProcess = async ({ distDir, appDir, build, isTSProject, watchAdmin, browser }) => {
  if (isTSProject) {
    await buildTypeScript({ srcDir: appDir, distDir, watch: false });
  }

  const config = loadConfiguration({ appDir, distDir });
  const serveAdminPanel = getOr(true, 'admin.serveAdminPanel')(config);

  const buildExists = fs.existsSync(path.join(distDir, 'build'));

  // Don't run the build process if the admin is in watch mode
  if (build && !watchAdmin && serveAdminPanel && !buildExists) {
    try {
      await buildAdmin({
        buildDestDir: distDir,
        forceBuild: false,
        optimization: false,
        srcDir: appDir,
      });
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

  cluster.on('message', async (worker, message) => {
    switch (message) {
      case 'reload':
        if (isTSProject) {
          await buildTypeScript({ srcDir: appDir, distDir, watch: false });
        }

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

const workerProcess = ({ appDir, distDir, watchAdmin, polling, isTSProject }) => {
  const strapiInstance = strapi({
    distDir,
    autoReload: true,
    serveAdminPanel: watchAdmin ? false : true,
  });

  const adminWatchIgnoreFiles = strapiInstance.config.get('admin.watchIgnoreFiles', []);
  watchFileChanges({
    appDir,
    strapiInstance,
    watchIgnoreFiles: adminWatchIgnoreFiles,
    polling,
    isTSProject,
  });

  process.on('message', async (message) => {
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
 * @param {string} options.appDir - This is the path where the app is located, the watcher will watch the files under this folder
 * @param {Strapi} options.strapi - Strapi instance
 * @param {array} options.watchIgnoreFiles - Array of custom file paths that should not be watched
 */
function watchFileChanges({ appDir, strapiInstance, watchIgnoreFiles, polling }) {
  const restart = async () => {
    if (strapiInstance.reload.isWatching && !strapiInstance.reload.isReloading) {
      strapiInstance.reload.isReloading = true;
      strapiInstance.reload();
    }
  };

  const watcher = chokidar.watch(appDir, {
    ignoreInitial: true,
    usePolling: polling,
    ignored: [
      /(^|[/\\])\../, // dot files
      /tmp/,
      '**/src/admin/**',
      '**/src/plugins/**/admin/**',
      '**/dist/src/plugins/test/admin/**',
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
      strapiInstance.dirs.static.public,
      joinBy('/', strapiInstance.dirs.static.public, '**'),
      '**/*.db*',
      '**/exports/**',
      '**/dist/**',
      ...watchIgnoreFiles,
    ],
  });

  watcher
    .on('add', (path) => {
      strapiInstance.log.info(`File created: ${path}`);
      restart();
    })
    .on('change', (path) => {
      strapiInstance.log.info(`File changed: ${path}`);
      restart();
    })
    .on('unlink', (path) => {
      strapiInstance.log.info(`File deleted: ${path}`);
      restart();
    });
}

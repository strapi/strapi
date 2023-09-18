import path from 'path';
import cluster from 'cluster';
import fs from 'fs-extra';
import chokidar from 'chokidar';
import execa from 'execa';
import { getOr } from 'lodash/fp';
import { joinBy } from '@strapi/utils';
import tsUtils from '@strapi/typescript-utils';
import type { Strapi } from '@strapi/types';

import loadConfiguration from '../../../core/app-configuration';
import strapi from '../../../index';
import { buildTypeScript, buildAdmin } from '../../builders';

interface CmdOptions {
  build?: boolean;
  watchAdmin?: boolean;
  polling?: boolean;
  browser?: boolean;
}

/**
 * `$ strapi develop`
 *
 */
export default async ({ build, watchAdmin, polling, browser }: CmdOptions) => {
  const appDir = process.cwd();

  const isTSProject = await tsUtils.isUsingTypeScript(appDir);
  const outDir = await tsUtils.resolveOutDir(appDir);
  const distDir = isTSProject ? outDir : appDir;

  try {
    if (cluster.isMaster || cluster.isPrimary) {
      return await primaryProcess({
        distDir,
        appDir,
        build,
        browser,
        isTSProject,
        watchAdmin,
      });
    }

    if (cluster.isWorker) {
      return await workerProcess({ appDir, distDir, watchAdmin, polling, isTSProject });
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

const primaryProcess = async ({
  distDir,
  appDir,
  build,
  isTSProject,
  watchAdmin,
  browser,
}: {
  distDir: string;
  appDir: string;
  build?: boolean;
  isTSProject: boolean;
  watchAdmin?: boolean;
  browser?: boolean;
}) => {
  if (isTSProject) {
    await buildTypeScript({ srcDir: appDir, distDir, ignoreDiagnostics: true });
  }

  const config = loadConfiguration({ app: appDir, dist: distDir });
  const serveAdminPanel = getOr(true, 'admin.serveAdminPanel', config);

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
      execa(
        'npm',
        ['run', '-s', 'strapi', 'watch-admin', '--', '--browser', browser ? 'true' : 'false'],
        {
          stdio: 'inherit',
        }
      );
    } catch (err) {
      process.exit(1);
    }
  }

  cluster.on('message', async (worker, message) => {
    switch (message) {
      case 'reload':
        if (isTSProject) {
          await buildTypeScript({ srcDir: appDir, distDir, ignoreDiagnostics: true });
        }

        console.info('The server is restarting\n');

        worker.send('kill');
        break;
      case 'killed':
        cluster.fork();
        break;
      case 'stop':
        process.exit(1);
        break;
      default: {
        break;
      }
    }
  });

  cluster.fork();
};

const workerProcess = async ({
  appDir,
  distDir,
  watchAdmin,
  polling,
  isTSProject,
}: {
  appDir: string;
  distDir: string;
  watchAdmin?: boolean;
  polling?: boolean;
  isTSProject: boolean;
}) => {
  const strapiInstance = await strapi({
    distDir,
    autoReload: true,
    serveAdminPanel: !watchAdmin,
  }).load();

  await tsUtils.generators.generate({
    strapi: strapiInstance,
    pwd: appDir,
    rootDir: undefined,
    logger: { silent: true, debug: false },
    artifacts: { contentTypes: true, components: true },
  });

  if (isTSProject) {
    await buildTypeScript({ srcDir: appDir, distDir, ignoreDiagnostics: false });
  }

  const adminWatchIgnoreFiles = strapiInstance.config.get('admin.watchIgnoreFiles', []);
  watchFileChanges({
    appDir,
    strapiInstance,
    watchIgnoreFiles: adminWatchIgnoreFiles,
    polling,
  });

  process.on('message', async (message) => {
    switch (message) {
      case 'kill': {
        await strapiInstance.destroy();
        process.send?.('killed');
        process.exit();
        break;
      }
      default: {
        break;
      }
      // Do nothing.
    }
  });

  return strapiInstance.start();
};

/**
 * Init file watching to auto restart strapi app
 */
function watchFileChanges({
  appDir,
  strapiInstance,
  watchIgnoreFiles,
  polling,
}: {
  appDir: string;
  strapiInstance: Strapi;
  watchIgnoreFiles: string[];
  polling?: boolean;
}) {
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
      '**/*.d.ts',
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

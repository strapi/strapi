import * as tsUtils from '@strapi/typescript-utils';
import { strings } from '@strapi/utils';
import chokidar from 'chokidar';
import fs from 'node:fs/promises';
import path from 'node:path';
import cluster from 'node:cluster';
import { createStrapi } from '@strapi/core';

import type { CLIContext } from '../cli/types';
import { checkRequiredDependencies } from './core/dependencies';
import { getTimer, prettyTime, type TimeMeasurer } from './core/timer';
import { createBuildContext } from './create-build-context';
import type { WebpackWatcher } from './webpack/watch';
import type { ViteWatcher } from './vite/watch';

import { writeStaticClientFiles } from './staticFiles';

interface DevelopOptions extends CLIContext {
  /**
   * Which bundler to use for building.
   *
   * @default webpack
   */
  bundler?: 'webpack' | 'vite';
  polling?: boolean;
  open?: boolean;
  watchAdmin?: boolean;
}

// This method removes all non-admin build files from the dist directory
const cleanupDistDirectory = async ({
  tsconfig,
  logger,
  timer,
}: Pick<DevelopOptions, 'tsconfig' | 'logger'> & { timer: TimeMeasurer }) => {
  const distDir = tsconfig?.config?.options?.outDir;

  if (
    !distDir || // we don't have a dist dir
    (await fs
      .access(distDir)
      .then(() => false)
      .catch(() => true)) // it doesn't exist -- if it does but no access, that will be caught later
  ) {
    return;
  }

  const timerName = `cleaningDist${Date.now()}`;
  timer.start(timerName);
  const cleaningSpinner = logger.spinner(`Cleaning dist dir ${distDir}`).start();

  try {
    const dirContent = await fs.readdir(distDir);
    const validFilenames = dirContent
      // Ignore the admin build folder
      .filter((filename) => filename !== 'build');
    for (const filename of validFilenames) {
      await fs.rm(path.resolve(distDir, filename), { recursive: true });
    }
  } catch (err: unknown) {
    const generatingDuration = timer.end(timerName);
    cleaningSpinner.text = `Error cleaning dist dir: ${err} (${prettyTime(generatingDuration)})`;
    cleaningSpinner?.fail();
    return;
  }

  const generatingDuration = timer.end(timerName);
  cleaningSpinner.text = `Cleaning dist dir (${prettyTime(generatingDuration)})`;
  cleaningSpinner?.succeed();
};

const develop = async ({
  cwd,
  polling,
  logger,
  tsconfig,
  watchAdmin,
  ...options
}: DevelopOptions) => {
  const timer = getTimer();

  if (cluster.isPrimary) {
    const { didInstall } = await checkRequiredDependencies({ cwd, logger }).catch((err) => {
      logger.error(err.message);
      process.exit(1);
    });

    if (didInstall) {
      return;
    }

    if (tsconfig?.config) {
      // Build without diagnostics in case schemas have changed
      await cleanupDistDirectory({ tsconfig, logger, timer });
      await tsUtils.compile(cwd, { configOptions: { ignoreDiagnostics: true } });
    }

    /**
     * IF we're not watching the admin we're going to build it, this makes
     * sure that at least the admin is built for users & they can interact
     * with the application.
     */
    if (!watchAdmin) {
      timer.start('createBuildContext');
      const contextSpinner = logger.spinner(`Building build context`).start();
      console.log('');

      const ctx = await createBuildContext({
        cwd,
        logger,
        tsconfig,
        options,
      });
      const contextDuration = timer.end('createBuildContext');
      contextSpinner.text = `Building build context (${prettyTime(contextDuration)})`;
      contextSpinner.succeed();

      timer.start('creatingAdmin');
      const adminSpinner = logger.spinner(`Creating admin`).start();

      await writeStaticClientFiles(ctx);

      if (ctx.bundler === 'webpack') {
        const { build: buildWebpack } = await import('./webpack/build');
        await buildWebpack(ctx);
      } else if (ctx.bundler === 'vite') {
        const { build: buildVite } = await import('./vite/build');
        await buildVite(ctx);
      }

      const adminDuration = timer.end('creatingAdmin');
      adminSpinner.text = `Creating admin (${prettyTime(adminDuration)})`;
      adminSpinner.succeed();
    }

    cluster.on('message', async (worker, message) => {
      switch (message) {
        case 'reload': {
          if (tsconfig?.config) {
            // Build without diagnostics in case schemas have changed
            await cleanupDistDirectory({ tsconfig, logger, timer });
            await tsUtils.compile(cwd, { configOptions: { ignoreDiagnostics: true } });
          }
          logger.debug('cluster has the reload message, sending the worker kill message');
          worker.send('kill');
          break;
        }
        case 'killed': {
          logger.debug('cluster has the killed message, forking the cluster');
          cluster.fork();
          break;
        }
        case 'stop': {
          process.exit(1);
          break;
        }
        default:
          break;
      }
    });

    cluster.fork();
  }

  if (cluster.isWorker) {
    timer.start('loadStrapi');
    const loadStrapiSpinner = logger.spinner(`Loading Strapi`).start();

    const strapi = createStrapi({
      appDir: cwd,
      distDir: tsconfig?.config.options.outDir ?? '',
      autoReload: true,
      serveAdminPanel: !watchAdmin,
    });

    /**
     * If we're watching the admin panel then we're going to attach the watcher
     * as a strapi middleware.
     */
    let bundleWatcher: WebpackWatcher | ViteWatcher | undefined;

    if (watchAdmin) {
      timer.start('createBuildContext');
      const contextSpinner = logger.spinner(`Building build context`).start();
      console.log('');

      const ctx = await createBuildContext({
        cwd,
        logger,
        strapi,
        tsconfig,
        options,
      });
      const contextDuration = timer.end('createBuildContext');
      contextSpinner.text = `Building build context (${prettyTime(contextDuration)})`;
      contextSpinner.succeed();

      timer.start('creatingAdmin');
      const adminSpinner = logger.spinner(`Creating admin`).start();

      await writeStaticClientFiles(ctx);

      if (ctx.bundler === 'webpack') {
        const { watch: watchWebpack } = await import('./webpack/watch');
        bundleWatcher = await watchWebpack(ctx);
      } else if (ctx.bundler === 'vite') {
        const { watch: watchVite } = await import('./vite/watch');
        bundleWatcher = await watchVite(ctx);
      }

      const adminDuration = timer.end('creatingAdmin');
      adminSpinner.text = `Creating admin (${prettyTime(adminDuration)})`;
      adminSpinner.succeed();
    }

    const strapiInstance = await strapi.load();

    const loadStrapiDuration = timer.end('loadStrapi');
    loadStrapiSpinner.text = `Loading Strapi (${prettyTime(loadStrapiDuration)})`;
    loadStrapiSpinner.succeed();

    // For TS projects, type generation is a requirement for the develop command so that the server can restart
    // For JS projects, we respect the experimental autogenerate setting
    if (tsconfig?.config || strapi.config.get('typescript.autogenerate') !== false) {
      timer.start('generatingTS');
      const generatingTsSpinner = logger.spinner(`Generating types`).start();

      await tsUtils.generators.generate({
        strapi: strapiInstance,
        pwd: cwd,
        rootDir: undefined,
        logger: { silent: true, debug: false },
        artifacts: { contentTypes: true, components: true },
      });

      const generatingDuration = timer.end('generatingTS');
      generatingTsSpinner.text = `Generating types (${prettyTime(generatingDuration)})`;
      generatingTsSpinner.succeed();
    }

    if (tsconfig?.config) {
      timer.start('compilingTS');
      const compilingTsSpinner = logger.spinner(`Compiling TS`).start();

      await cleanupDistDirectory({ tsconfig, logger, timer });
      await tsUtils.compile(cwd, { configOptions: { ignoreDiagnostics: false } });

      const compilingDuration = timer.end('compilingTS');
      compilingTsSpinner.text = `Compiling TS (${prettyTime(compilingDuration)})`;
      compilingTsSpinner.succeed();
    }

    const restart = async () => {
      if (strapiInstance.reload.isWatching && !strapiInstance.reload.isReloading) {
        strapiInstance.reload.isReloading = true;
        strapiInstance.reload();
      }
    };

    const watcher = chokidar
      .watch(cwd, {
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
          '**/log',
          '**/log/**',
          '**/logs',
          '**/logs/**',
          '**/*.log',
          '**/index.html',
          '**/public',
          '**/public/**',
          strapiInstance.dirs.static.public,
          strings.joinBy('/', strapiInstance.dirs.static.public, '**'),
          '**/*.db*',
          '**/exports/**',
          '**/dist/**',
          '**/*.d.ts',
          '**/.yalc/**',
          '**/yalc.lock',
          // TODO v6: watch only src folder by default, and flip this to watchIncludeFiles
          ...strapiInstance.config.get('admin.watchIgnoreFiles', []),
        ],
      })
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

    process.on('message', async (message) => {
      switch (message) {
        case 'kill': {
          logger.debug(
            'child process has the kill message, destroying the strapi instance and sending the killed process message'
          );
          await watcher.close();

          await strapiInstance.destroy();

          if (bundleWatcher) {
            bundleWatcher.close();
          }
          process.send?.('killed');
          break;
        }
        default:
          break;
      }
    });

    strapiInstance.start();
  }
};

export { develop };
export type { DevelopOptions };

import fs from 'node:fs/promises';
import path from 'node:path';
import cluster from 'node:cluster';

import type chokidarType from 'chokidar';
import type { createStrapi as CreateStrapi } from '@strapi/core';
import { importModule } from '@strapi/utils';
import type { CLIContext } from '../cli/types';
import { handleAdminDependencies } from './core/ensure-admin-dependencies';
import { getTimer, prettyTime, type TimeMeasurer } from './core/timer';
import type { WebpackWatcher } from './webpack/watch';
import type { ViteWatcher } from './vite/watch';
import type { Logger } from '../cli/utils/logger';

// Lazy: worker-only deps; primary cluster process should not pay for them
const lazy = <T>(specifier: string) => {
  let cached: T | undefined;
  let promise: Promise<T> | undefined;
  return async (): Promise<T> => {
    if (cached !== undefined) {
      return cached;
    }
    promise ??= importModule<T>(specifier).then((mod) => {
      cached = mod;
      return mod;
    });
    return promise;
  };
};
const tsUtils = lazy<typeof import('@strapi/typescript-utils')>('@strapi/typescript-utils');
const utils = lazy<typeof import('@strapi/utils')>('@strapi/utils');
const chokidar = lazy<typeof chokidarType>('chokidar');
const core = lazy<typeof import('@strapi/core')>('@strapi/core');
const buildCtx = lazy<typeof import('./create-build-context')>('./create-build-context');
const staticFs = lazy<typeof import('./staticFiles')>('./staticFiles');

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
  buildAdmin?: boolean;
  /**
   * Auto-install missing admin dependencies
   *
   * @default true
   */
  installDeps?: boolean;
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
      // Ignore the admin build folder and the TypeScript incremental cache
      .filter((filename) => filename !== 'build' && !filename.endsWith('.tsbuildinfo'));
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
  buildAdmin,
  installDeps = true,
  ...options
}: DevelopOptions) => {
  const timer = getTimer();

  if (cluster.isPrimary) {
    const shouldContinue = await handleAdminDependencies({
      cwd,
      logger,
      installIfMissing: installDeps,
    });

    if (!shouldContinue) {
      return;
    }

    if (tsconfig?.config) {
      // Build without diagnostics in case schemas have changed
      await cleanupDistDirectory({ tsconfig, logger, timer });
      try {
        await (await tsUtils()).compile(cwd, { configOptions: { ignoreDiagnostics: true } });
      } catch (err: unknown) {
        logger.error(`Error during initial TypeScript compilation: ${(err as Error).message}`);
        // We don't return here because we want to attempt to start the server even if the initial compilation fails, as it can be fixed while the server is running
      }
    }

    /**
     * IF we're not watching the admin we're going to build it, this makes
     * sure that at least the admin is built for users & they can interact
     * with the application.
     */
    if (!watchAdmin && buildAdmin) {
      timer.start('createBuildContext');
      const contextSpinner = logger.spinner(`Building build context`).start();
      console.log('');

      const ctx = await (
        await buildCtx()
      ).createBuildContext({
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

      await (await staticFs()).writeStaticClientFiles(ctx);

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
            try {
              // Build without diagnostics in case schemas have changed
              await cleanupDistDirectory({ tsconfig, logger, timer });
              await (await tsUtils()).compile(cwd, { configOptions: { ignoreDiagnostics: true } });
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              logger.error(`Error during TypeScript compilation on reload: ${message}`);
              process.exit(1);
            }
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

    const strapi = (await core()).createStrapi({
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

    const strapiInstance = await strapi.load();

    const contextSpinner = logger.spinner(`Building build context`);
    const adminSpinner = logger.spinner(`Creating admin`);
    const generatingTsSpinner = logger.spinner(`Generating types`);
    const compilingTsSpinner = logger.spinner(`Compiling TS`);

    let watcherStarted = false;
    const ensureWatcher = async () => {
      if (!watcherStarted) {
        watcherStarted = true;
        await startWatcher(strapiInstance, cwd, polling ?? false, logger, bundleWatcher);
      }
    };

    try {
      if (watchAdmin) {
        timer.start('createBuildContext');
        contextSpinner.start();

        const ctx = await (
          await buildCtx()
        ).createBuildContext({
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
        adminSpinner.start();

        await (await staticFs()).writeStaticClientFiles(ctx);

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

      const loadStrapiDuration = timer.end('loadStrapi');
      loadStrapiSpinner.text = `Loading Strapi (${prettyTime(loadStrapiDuration)})`;
      loadStrapiSpinner.succeed();

      // For TS projects, type generation is a requirement for the develop command so that the server can restart
      // For JS projects, we respect the experimental autogenerate setting
      if (tsconfig?.config || strapi.config.get('typescript.autogenerate') !== false) {
        timer.start('generatingTS');
        generatingTsSpinner.start();

        await (
          await tsUtils()
        ).generators.generate({
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
        compilingTsSpinner.start();

        await cleanupDistDirectory({ tsconfig, logger, timer });
        await (await tsUtils()).compile(cwd, { configOptions: { ignoreDiagnostics: false } });

        const compilingDuration = timer.end('compilingTS');
        compilingTsSpinner.text = `Compiling TS (${prettyTime(compilingDuration)})`;
        compilingTsSpinner.succeed();
      }

      await ensureWatcher();

      strapiInstance.start();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Error during development: ${message}`);

      if (loadStrapiSpinner.isSpinning) {
        loadStrapiSpinner.fail();
      }
      // Fail any spinners that were left running.
      if (contextSpinner.isSpinning) {
        contextSpinner.fail();
      }
      if (compilingTsSpinner.isSpinning) {
        compilingTsSpinner.fail();
      }
      if (adminSpinner.isSpinning) {
        adminSpinner.fail();
      }
      if (generatingTsSpinner.isSpinning) {
        generatingTsSpinner.fail();
      }

      await ensureWatcher();
    }
  }
};

async function startWatcher(
  strapiInstance: Awaited<ReturnType<typeof CreateStrapi>>,
  cwd: string,
  polling: boolean,
  logger: Logger,
  bundleWatcher?: WebpackWatcher | ViteWatcher
) {
  const restart = async () => {
    if (strapiInstance.reload.isWatching && !strapiInstance.reload.isReloading) {
      strapiInstance.reload.isReloading = true;
      strapiInstance.reload();
    }
  };

  const chokidarLib = await chokidar();
  const utilsLib = await utils();

  const watcher = chokidarLib
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
        utilsLib.strings.joinBy('/', strapiInstance.dirs.static.public, '**'),
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
}

export { develop };
export type { DevelopOptions };

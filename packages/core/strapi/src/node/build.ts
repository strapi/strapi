import * as tsUtils from '@strapi/typescript-utils';
import type { CLIContext } from '../cli/types';
import { checkRequiredDependencies } from './core/dependencies';
import { getTimer, prettyTime } from './core/timer';
import { createBuildContext } from './create-build-context';
import { writeStaticClientFiles } from './staticFiles';

interface BuildOptions extends CLIContext {
  /**
   * Which bundler to use for building.
   *
   * @default webpack
   */
  bundler?: 'webpack' | 'vite';
  /**
   * Minify the output
   *
   * @default true
   */
  minify?: boolean;
  /**
   * Generate sourcemaps – useful for debugging bugs in the admin panel UI.
   */
  sourcemaps?: boolean;
  /**
   * Print stats for build
   */
  stats?: boolean;
}

/**
 * @example `$ strapi build`
 *
 * @description Builds the admin panel of the strapi application.
 */
const build = async ({ logger, cwd, tsconfig, ...options }: BuildOptions) => {
  const timer = getTimer();

  const { didInstall } = await checkRequiredDependencies({ cwd, logger }).catch((err) => {
    logger.error(err.message);
    process.exit(1);
  });

  if (didInstall) {
    return;
  }

  if (tsconfig?.config) {
    timer.start('compilingTS');
    const compilingTsSpinner = logger.spinner(`Compiling TS`).start();

    tsUtils.compile(cwd, { configOptions: { ignoreDiagnostics: false } });

    const compilingDuration = timer.end('compilingTS');
    compilingTsSpinner.text = `Compiling TS (${prettyTime(compilingDuration)})`;
    compilingTsSpinner.succeed();
  }

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

  timer.start('buildAdmin');
  const buildingSpinner = logger.spinner(`Building admin panel`).start();
  console.log('');

  try {
    await writeStaticClientFiles(ctx);

    if (ctx.bundler === 'webpack') {
      const { build: buildWebpack } = await import('./webpack/build');
      await buildWebpack(ctx);
    } else if (ctx.bundler === 'vite') {
      const { build: buildVite } = await import('./vite/build');
      await buildVite(ctx);
    }

    const buildDuration = timer.end('buildAdmin');
    buildingSpinner.text = `Building admin panel (${prettyTime(buildDuration)})`;
    buildingSpinner.succeed();
  } catch (err) {
    buildingSpinner.fail();
    throw err;
  }
};

export { build };
export type { BuildOptions };

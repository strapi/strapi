import * as tsUtils from '@strapi/typescript-utils';
import { checkRequiredDependencies } from './core/dependencies';
import { writeStaticClientFiles } from './staticFiles';
import { build as buildWebpack } from './webpack/build';
import { createBuildContext } from './createBuildContext';

import EE from '@strapi/strapi/dist/utils/ee';
import { getTimer } from './core/timer';

import type { CLIContext } from '@strapi/strapi';

interface BuildOptions extends CLIContext {
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
    compilingTsSpinner.text = `Compiling TS (${compilingDuration}ms)`;
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
  contextSpinner.text = `Building build context (${contextDuration}ms)`;
  contextSpinner.succeed();

  timer.start('buildAdmin');
  const buildingSpinner = logger.spinner(`Building admin panel`).start();
  console.log('');

  try {
    EE.init(cwd);

    await writeStaticClientFiles(ctx);
    await buildWebpack(ctx);

    const buildDuration = timer.end('buildAdmin');
    buildingSpinner.text = `Building admin panel (${buildDuration}ms)`;
    buildingSpinner.succeed();
  } catch (err) {
    buildingSpinner.fail();
    throw err;
  }
};

export { build };
export type { BuildOptions };

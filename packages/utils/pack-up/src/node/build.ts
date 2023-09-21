import fs from 'fs/promises';
import ora from 'ora';

import { CommonCLIOptions } from '../types';

import { loadConfig } from './core/config';
import { getExportExtensionMap, validateExportsOrdering } from './core/exports';
import { createLogger } from './core/logger';
import { loadPkg, validatePkg } from './core/pkg';
import { createBuildContext } from './createBuildContext';
import { BuildTask, createBuildTasks } from './createTasks';
import { TaskHandler, taskHandlers } from './tasks';

export interface BuildOptions extends CommonCLIOptions {
  cwd?: string;
  minify?: boolean;
  sourcemap?: boolean;
}

export const build = async (opts: BuildOptions = {}) => {
  const { silent, debug, cwd = process.cwd(), ...configOptions } = opts;

  const logger = createLogger({ silent, debug });

  /**
   * Load the closest package.json and then verify the structure against what we expect.
   */
  const packageJsonLoader = ora('Verifying package.json \n').start();

  const rawPkg = await loadPkg({ cwd, logger }).catch((err) => {
    packageJsonLoader.fail();
    logger.error(err.message);
    logger.debug(`Path checked – ${cwd}`);
    process.exit(1);
  });

  const validatedPkg = await validatePkg({
    pkg: rawPkg,
  }).catch((err) => {
    packageJsonLoader.fail();
    logger.error(err.message);
    process.exit(1);
  });

  /**
   * Validate the exports of the package incl. the order of the
   * exports within the exports map if applicable
   */
  const packageJson = await validateExportsOrdering({ pkg: validatedPkg, logger }).catch((err) => {
    packageJsonLoader.fail();
    logger.error(err.message);
    process.exit(1);
  });

  packageJsonLoader.succeed('Verified package.json');

  /**
   * We create tasks based on the exports of the package.json
   * their handlers are then ran in the order of the exports map
   * and results are logged to see gradual progress.
   */
  const config = await loadConfig({ cwd, logger });

  const buildContextLoader = ora('Creating build context \n').start();

  const extMap = getExportExtensionMap();

  const ctx = await createBuildContext({
    config: { ...config, ...configOptions },
    cwd,
    extMap,
    logger,
    pkg: packageJson,
  }).catch((err) => {
    buildContextLoader.fail();
    logger.error(err.message);
    process.exit(1);
  });

  logger.debug('Build context: \n', ctx);

  const buildTasks = await createBuildTasks(ctx);

  buildContextLoader.succeed('Created build context');

  /**
   * If the distPath already exists, clean it
   */
  try {
    logger.debug(`Cleaning dist folder: ${ctx.distPath}`);
    await fs.rm(ctx.distPath, { recursive: true, force: true });
    logger.debug('Cleaned dist folder');
  } catch {
    // do nothing, it will fail if the folder does not exist
    logger.debug('There was no dist folder to clean');
  }

  for (const task of buildTasks) {
    const handler = taskHandlers[task.type] as TaskHandler<BuildTask>;

    handler.print(ctx, task);

    const result$ = handler.run$(ctx, task);

    result$.subscribe({
      complete() {
        handler.success(ctx, task);
      },
      error(err) {
        handler.fail(ctx, task, err);
      },
    });
  }
};

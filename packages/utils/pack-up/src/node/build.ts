import fs from 'fs/promises';
import ora from 'ora';

import { CommonCLIOptions } from '../types';

import { createLogger } from './core/logger';
import { loadPkg, validatePkg } from './core/pkg';
import { getExportExtensionMap, validateExportsOrdering } from './core/exports';
import { createBuildContext } from './createBuildContext';
import { BuildTask, createBuildTasks } from './createBuildTasks';
import { TaskHandler, taskHandlers } from './tasks';

export interface BuildOptions extends CommonCLIOptions {
  cwd?: string;
}

export const build = async (opts: BuildOptions) => {
  const { silent, debug, cwd = process.cwd() } = opts;

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

  const buildContextLoader = ora('Creating build context \n').start();

  const extMap = getExportExtensionMap();

  const ctx = await createBuildContext({
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

    await handler.run(ctx, task).catch((err) => {
      if (err instanceof Error) {
        logger.error(err.message);
      }

      process.exit(1);
    });
  }
};

import fs from 'fs/promises';
import ora from 'ora';
import os from 'os';

import { CommonCLIOptions } from '../types';

import { loadConfig, type Config } from './core/config';
import { isError } from './core/errors';
import { getExportExtensionMap, validateExportsOrdering } from './core/exports';
import { createLogger } from './core/logger';
import { loadPkg, validatePkg } from './core/pkg';
import { createBuildContext } from './createBuildContext';
import { BuildTask, createBuildTasks } from './createTasks';
import { TaskHandler, taskHandlers } from './tasks';

interface BuildCLIOptions extends CommonCLIOptions {
  minify?: boolean;
  sourcemap?: boolean;
}

interface BuildWithConfigFile extends BuildCLIOptions {
  configFile?: true;
  config?: never;
  cwd?: string;
}

interface BuildWithoutConfigFile extends BuildCLIOptions {
  configFile: false;
  config?: Config;
  cwd?: string;
}

type BuildOptions = BuildWithConfigFile | BuildWithoutConfigFile;

const build = async (opts: BuildOptions = {}) => {
  /**
   * We always want to run in production mode when building and some packages
   * use NODE_ENV to determine which type of package to import (looking at your react).
   * Therefore for building, unless it's specifically set by the user, we'll set it to production.
   */
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';

  const {
    silent,
    debug,
    cwd = process.cwd(),
    configFile = true,
    config: providedConfig,
    ...configOptions
  } = opts;

  const logger = createLogger({ silent, debug });

  /**
   * Load the closest package.json and then verify the structure against what we expect.
   */
  const packageJsonLoader = ora(`Verifying package.json ${os.EOL}`).start();

  const rawPkg = await loadPkg({ cwd, logger }).catch((err) => {
    packageJsonLoader.fail();

    if (isError(err)) {
      logger.error(err.message);
    }

    logger.debug(`Path checked – ${cwd}`);
    process.exit(1);
  });

  const validatedPkg = await validatePkg({
    pkg: rawPkg,
  }).catch((err) => {
    packageJsonLoader.fail();

    if (isError(err)) {
      logger.error(err.message);
    }

    process.exit(1);
  });

  /**
   * Validate the exports of the package incl. the order of the
   * exports within the exports map if applicable
   */
  const packageJson = await validateExportsOrdering({ pkg: validatedPkg, logger }).catch((err) => {
    packageJsonLoader.fail();
    if (isError(err)) {
      logger.error(err.message);
    }
    process.exit(1);
  });

  packageJsonLoader.succeed('Verified package.json');

  /**
   * If configFile is true – which is the default, atempt to load the config
   * otherwise if it's explicitly false then we suspect there might be a config passed
   * in the options, so we'll use that instead.
   */
  const config = configFile ? await loadConfig({ cwd, logger }) : providedConfig;

  /**
   * We create tasks based on the exports of the package.json
   * their handlers are then ran in the order of the exports map
   * and results are logged to see gradual progress.
   */
  const buildContextLoader = ora(`Creating build context ${os.EOL}`).start();

  const extMap = getExportExtensionMap();

  const ctx = await createBuildContext({
    config: { ...config, ...configOptions },
    cwd,
    extMap,
    logger,
    pkg: packageJson,
  }).catch((err) => {
    buildContextLoader.fail();
    if (isError(err)) {
      logger.error(err.message);
    }
    process.exit(1);
  });

  logger.debug(`Build context: ${os.EOL}`, ctx);

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

export { build };
export type { BuildOptions, BuildCLIOptions, BuildWithConfigFile, BuildWithoutConfigFile };

'use strict';

const fs = require('fs/promises');
const boxen = require('boxen');
const chalk = require('chalk');
const ora = require('ora');
const { createLogger } = require('../../../utils/logger');
const { notifyExperimentalCommand } = require('../../../utils/helpers');
const {
  loadPkg,
  validatePkg,
  validateExportsOrdering,
  getExportExtensionMap,
} = require('../../../utils/pkg');
const { createBuildContext, createBuildTasks } = require('../../../builders/packages');
const { buildTaskHandlers } = require('../../../builders/tasks');

/**
 *
 * @param {object} args
 * @param {boolean} args.yes
 * @param {boolean} args.debug
 */
module.exports = async ({ yes, debug }) => {
  const logger = createLogger({ debug, timestamp: false });
  try {
    /**
     * Notify users this is an experimental command and get them to approve first
     * this can be opted out by setting the argument --yes
     */
    await notifyExperimentalCommand({ yes });

    const cwd = process.cwd();

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
      /**
       * @type {import('../../../builders/tasks').TaskHandler<any>}
       */
      const handler = buildTaskHandlers[task.type];
      handler.print(ctx, task);

      try {
        const result = await handler.run(ctx, task);
        handler.success(ctx, task, result);
      } catch (err) {
        handler.fail(ctx, task, err);

        if (err instanceof Error) {
          logger.error(err.message);
        }

        process.exit(1);
      }
    }
  } catch (err) {
    logger.error(
      'There seems to be an unexpected error, try again with --debug for more information \n'
    );
    console.log(
      chalk.red(
        boxen(err.stack, {
          padding: 1,
          align: 'left',
        })
      )
    );
    process.exit(1);
  }
};

import fs from 'fs/promises';
import boxen from 'boxen';
import chalk from 'chalk';
import ora from 'ora';
import { createLogger } from '../../../utils/logger';
import { notifyExperimentalCommand } from '../../../utils/helpers';
import {
  loadPkg,
  validatePkg,
  validateExportsOrdering,
  getExportExtensionMap,
} from '../../../utils/pkg';
import { createBuildContext, createBuildTasks } from '../../../builders/packages';
import { buildTaskHandlers } from '../../../builders/tasks';

interface ActionOptions {
  force?: boolean;
  debug?: boolean;
}

export default async ({ force, debug }: ActionOptions) => {
  const logger = createLogger({ debug, timestamp: false });
  try {
    /**
     * Notify users this is an experimental command and get them to approve first
     * this can be opted out by setting the argument --yes
     */
    await notifyExperimentalCommand({ force });

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
    const packageJson = await validateExportsOrdering({ pkg: validatedPkg, logger }).catch(
      (err) => {
        packageJsonLoader.fail();
        logger.error(err.message);
        process.exit(1);
      }
    );

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
      const handler = buildTaskHandlers(task);
      handler.print(ctx, task);

      await handler.run(ctx, task).catch((err: NodeJS.ErrnoException) => {
        if (err instanceof Error) {
          logger.error(err.message);
        }

        process.exit(1);
      });
    }
  } catch (err) {
    logger.error(
      'There seems to be an unexpected error, try again with --debug for more information \n'
    );
    if (err instanceof Error && err.stack) {
      console.log(
        chalk.red(
          boxen(err.stack, {
            padding: 1,
            align: 'left',
          })
        )
      );
    }
    process.exit(1);
  }
};

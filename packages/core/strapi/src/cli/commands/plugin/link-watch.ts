import boxen from 'boxen';
import chalk from 'chalk';
import concurrently from 'concurrently';
import fs from 'node:fs/promises';
import path from 'node:path';
import nodemon from 'nodemon';
import { outdent } from 'outdent';

import { runAction } from '../../utils/helpers';
import type { CLIContext, StrapiCommand } from '../../types';
import { loadPkg, validatePkg } from '../../utils/pkg';

interface ActionOptions {}

const action = async (_opts: ActionOptions, _cmd: unknown, { cwd, logger }: CLIContext) => {
  try {
    const outDir = './dist';
    const extensions = 'ts,js,png,svg,gif,jpeg,css';

    nodemon({
      watch: [outDir],
      ext: extensions,
      exec: 'yalc push --changed',
    });

    const folder = path.join(cwd, outDir);

    if (!(await pathExists(folder))) {
      await fs.mkdir(folder);
    }

    const pkg = await loadPkg({ cwd, logger });
    const pkgJson = await validatePkg({ pkg });

    concurrently(['npm run watch']);

    nodemon
      .on('start', () => {
        logger.info(
          outdent`
        Watching ${outDir} for changes to files with extensions: ${extensions}

        To use this package in Strapi, in a separate shell run:
        cd /path/to/strapi/project

        Then run one of the commands below based on the package manager used in that project:

        ## yarn
        ${chalk.greenBright(`yarn dlx yalc add --link ${pkgJson.name} && yarn install`)}

        ## npm
        ${chalk.greenBright(
          `npx yalc add ${pkgJson.name} && npx yalc link ${pkgJson.name} && npm install`
        )}
      `.trimStart()
        );
      })
      .on('quit', () => {
        process.exit();
      })
      .on('restart', (files) => {
        logger.info('Found changes in files:', chalk.magentaBright(files));
        logger.info('Pushing new yalc package...');
      });
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

/**
 * @internal
 */
const pathExists = async (path: string) => {
  try {
    await fs.access(path);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * `$ strapi plugin:watch:link`
 */
const command: StrapiCommand = ({ command, ctx }) => {
  command
    .command('plugin:watch:link')
    .description('Recompiles your plugin automatically on changes and runs yalc push --publish')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .action((...args) => runAction('plugin:watch:link', action)(...args, ctx));
};

export { command };

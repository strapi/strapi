import chalk from 'chalk';

import { VersionRange, createCodemodsLoader } from '../../core/codemods';
import { createLogger } from '../../core/logger';
import { loadPkg } from '../../core/pkg';
import { createVersionParser } from '../../core/version';
import { handleError } from '../errors';

import type { CLIOptions } from '../../types';
import { createLogger } from '../../core';

export const next = async (options: CLIOptions) => {
  try {
    const logger = createLogger({ silent: options.silent, debug: options.debug });

    logger.warn(
      "Please make sure you've created a backup of your codebase and files before running the upgrade tool"
    );

    // TODO: Don't use the project version but look at the @strapi dependencies instead
    // ?: What strategy should we adopt if there are multiple @strapi dependencies with different versions?
    //     - Use latest?
    //     - Use @strapi/strapi one? <- Seems like the best choice for the moment
    const dependencies = pkg.dependencies ?? {};
    const version = dependencies['@strapi/strapi'] as Version.SemVer | undefined;

    if (version === undefined) {
      logger.error(
        `No version of "@strapi/strapi" were found in the project's package.json. Are you in a valid Strapi project?`
      );
      process.exit(1);
    }

    // TODO: Allow to load the app codemods directory
    // const codemodsDir = path.join(cwd, 'codemods');

    const fCurrentVersion = chalk.italic(chalk.yellow(version));

    logger.info(`Found current version ${fCurrentVersion}`);

    const range: VersionRange = { from: version, to: 'latest' };

    const codemodsLoader = createCodemodsLoader({ logger, range });
    const parser = createVersionParser(version).setAvailable(codemodsLoader.availableVersions);
    const target = parser.nextMajor();

    const fNextMajor = chalk.underline(chalk.italic(chalk.yellow(target)));

    logger.info(chalk.bold(chalk.green(`Next major upgrade is ${fNextMajor}`)));

    if (target) {
      const loaded = codemodsLoader.load(target);

      const fTarget = chalk.italic(chalk.yellow(target));
      const fNbLoaded = chalk.bold(chalk.underline(loaded.length));
      const fLoaded = loaded.map(({ path }) => chalk.cyan(path)).join(', ');

      logger.info(`Found ${fNbLoaded} code mod(s) for ${fTarget} (${fLoaded})`);
      logger.info(
        chalk.bold(chalk.green(`About to upgrade from ${fCurrentVersion} to ${fTarget}`))
      );
    } else {
      logger.info('Seems like the current version is the latest major');
    }
  } catch (err) {
    handleError(err);
  }
};

const confirm = async (message: string) => {
  const { confirm } = await prompts({
    name: 'confirm',
    type: 'confirm',
    message,
  });

  // If confirm is undefined (Ctrl + C), default to false
  return confirm ?? false;
};

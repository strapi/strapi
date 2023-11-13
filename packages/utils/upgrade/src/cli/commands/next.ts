import * as path from 'node:path';
import chalk from 'chalk';

import { handleError } from '../errors';
import { loadPkg } from '../../core/pkg';
import { createLogger } from '../../core/logger';
import { createVersionParser, nextMajor } from '../../core/version';
import { createCodemodsLoader, VersionRange } from '../../core/codemods';

import type { CLIOptions, Version } from '../../types';

export const next = async (options: CLIOptions) => {
  // get current version
  // find all available versions
  // find next major
  // if it exists => (fix current first) + upgrade to this version
  // else => throws an error ("already on last major, you can try running fix-current")

  try {
    const logger = createLogger({ silent: options.silent, debug: options.debug });
    const cwd = process.cwd();

    // TODO: Remove any, use yup validation on the package.json (validate dependencies)
    const pkg = (await loadPkg({ cwd, logger })) as any;

    // TODO: Don't use the project version but look at the @strapi dependencies instead
    // ?: What strategy should we adopt if there are multiple @strapi dependencies with different versions?
    //     - Use latest?
    //     - Use @strapi/strapi one? <- Seems like the best choice for the moment
    const dependencies = pkg['dependencies'] ?? {};
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

    logger.debug(`Found current version ${fCurrentVersion}`);

    const range: VersionRange = { from: version, to: 'latest' };

    const codemodsLoader = createCodemodsLoader({ logger, range });
    const parser = createVersionParser(version).setAvailable(codemodsLoader.availableVersions);
    const target = parser.nextMajor();

    const fNextMajor = chalk.underline(chalk.italic(chalk.yellow(target)));

    logger.debug(chalk.bold(chalk.green(`Next major upgrade is ${fNextMajor}`)));

    if (target) {
      const loaded = codemodsLoader.load(target);

      const fTarget = chalk.italic(chalk.yellow(target));
      const fNbLoaded = chalk.bold(chalk.underline(loaded.length));
      const fLoaded = loaded.map(({ path }) => chalk.cyan(path)).join(', ');

      logger.debug(`Found ${fNbLoaded} code mod(s) for ${fTarget} (${fLoaded})`);
      logger.debug(
        chalk.bold(chalk.green(`About to upgrade from ${fCurrentVersion} to ${fTarget}`))
      );
    } else {
      logger.debug('Seems like the current version is the latest major');
    }
  } catch (err) {
    console.log(err);
    handleError(err);
  }
};

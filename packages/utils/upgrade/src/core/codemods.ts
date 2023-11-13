import chalk from 'chalk';
import { readdirSync, statSync } from 'node:fs';
import * as path from 'node:path';
import * as semver from 'semver';

import { Logger } from './logger';

import type { Version } from '../types';

export interface VersionRange {
  from: Version.SemVer;
  to: Version.Any;
}

export interface CreateLoaderOptions {
  dir?: string;
  range: VersionRange;
  logger: Logger;
}

const INTERNAL_CODEMODS_DIR = path.join(__dirname, '..', '..', 'resources', 'codemods');
const CODEMOD_SUFFIX = '.codemod';
const CODEMOD_EXT = '.ts';

const createSemverRange = (range: VersionRange): semver.Range => {
  let semverRange = `>${range.from}`;

  // Add the upper boundary if range.to is different from 'latest'
  if (range.to !== 'latest') {
    semverRange += ` <${range.to}`;
  }

  return new semver.Range(semverRange);
};

export const createCodemodsLoader = (options: CreateLoaderOptions) => {
  const { dir = INTERNAL_CODEMODS_DIR, range, logger } = options;

  const semverRange = createSemverRange(range);

  // TODO: Maybe add some more logs regarding what folders are accepted/discarded
  const versions = readdirSync(dir)
    // Only keep root directories
    .filter((filePath) => statSync(path.join(dir, filePath)).isDirectory())
    // Paths should be valid semver
    .filter((filePath): filePath is Version.SemVer => semver.valid(filePath) !== null)
    // Should satisfy the given range
    .filter((filePath) => semverRange.test(filePath))
    // Sort versions in ascending order
    .sort(semver.compare) as Version.SemVer[];

  if (versions.length === 0) {
    // TODO: Use custom upgrade errors
    throw new Error(`Invalid codemods directory provided "${dir}"`);
  }

  const fNbFound = chalk.bold(chalk.underline(versions.length));
  const fRange = chalk.bold(chalk.green(semverRange.raw));
  const fVersions = chalk.italic(chalk.yellow(versions.join(', ')));

  logger.info(`Found ${fNbFound} upgrades matching ${fRange} (${fVersions})`);

  // Note: We're casting the result as a string since we know there is at least one item in the `versions` array
  const latest = versions.at(-1) as string;

  const fLatest = chalk.italic(chalk.yellow(latest));

  logger.info(`Latest upgrade is ${fLatest}`);

  /**
   * Verifies that the given version matches the available ones
   */
  const isValid = (version: Version.Any) => {
    return version === 'latest' || versions.includes(version);
  };

  /**
   * Load code mods paths for a given version
   * Throws an error if the version can't be found or is invalid
   */
  const load = (version: Version.Any) => {
    if (!isValid(version)) {
      // TODO: Use custom upgrade errors
      throw new Error(`Invalid version provided. Valid versions are ${versions.join(', ')}`);
    }

    const target = version === 'latest' ? latest : version;

    const fullPath = (filePath: string) => path.join(dir, version, filePath);

    // TODO: Update depending on what's needed to execute codemods
    // NOTE: We will probably have to modify this if we want to handle sub-groups (admin, etc...)
    //       In this case, we would instead load each groups separately
    return readdirSync(path.join(dir, target))
      .filter((filePath) => statSync(fullPath(filePath)).isFile())
      .filter((filePath) => filePath.endsWith(`${CODEMOD_SUFFIX}${CODEMOD_EXT}`))
      .map((filePath) => ({ path: filePath, fullPath: fullPath(filePath), version }));
  };

  return {
    get availableVersions() {
      return versions;
    },

    get latest(): string | undefined {
      return latest;
    },

    isValid,
    load,
  };
};

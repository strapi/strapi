import { glob } from 'glob';
import chalk from 'chalk';
import path from 'node:path';
import assert from 'node:assert';
import fs from 'node:fs/promises';

import { isSemVer } from './version';
import * as f from './format';

import type { Logger } from './logger';
import type { SemVer } from './version';

export interface ProjectLoaderOptions {
  cwd: string;
  allowedExtensions?: string[];
  allowedRootPaths?: string[];
  logger: Logger;
}

export interface ProjectLoader {
  cwd: string;
  load(): Promise<ProjectComponents>;
}

export interface ProjectComponents {
  cwd: string;
  packageJSON: any;
  files: string[];
  strapiVersion: SemVer;
}

type MinimalPackageJSON = {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
} & Record<string, unknown>;

const PROJECT_PACKAGE_JSON = 'package.json';
const PROJECT_DEFAULT_ALLOWED_ROOT_PATHS = ['src', 'config', 'public'];
const PROJECT_DEFAULT_ALLOWED_EXTENSIONS = ['js', 'ts', 'json'];
const PROJECT_DEFAULT_PATTERNS = ['package.json'];
const STRAPI_DEPENDENCY_NAME = '@strapi/strapi';
const F_STRAPI_DEPENDENCY_NAME = f.highlight(STRAPI_DEPENDENCY_NAME);
const F_PROJECT_PACKAGE_JSON = f.highlight(PROJECT_PACKAGE_JSON);

export const createProjectLoader = (options: ProjectLoaderOptions): ProjectLoader => {
  const { cwd, logger } = options;

  const load = async (): Promise<ProjectComponents> => {
    logger.debug(`Loading project's components for ${f.path(cwd)}`);

    const packageJSON = await loadPackageJSON(options);
    const files = await loadProjectFiles(options);
    const strapiVersion = parseStrapiVersion(packageJSON, options);

    return { cwd, packageJSON, files, strapiVersion };
  };

  return { cwd, load };
};

// TODO: Remove any for the package.json structure, use yup validation on the package.json (validate dependencies)
const loadPackageJSON = async (options: ProjectLoaderOptions): Promise<any> => {
  const { cwd, logger } = options;
  const fPath = f.path(cwd);

  const packagePath = path.join(cwd, PROJECT_PACKAGE_JSON);

  try {
    await fs.access(packagePath);
  } catch {
    throw new Error(`Could not find a ${F_PROJECT_PACKAGE_JSON} file in ${fPath}`);
  }

  const packageJSON = require(packagePath);

  logger.debug(
    `Loaded package.json for ${f.highlight(packageJSON.name)} (${f.version(packageJSON.version)})`
  );

  return packageJSON;
};

const loadProjectFiles = async (options: ProjectLoaderOptions): Promise<string[]> => {
  const { cwd, logger } = options;

  const allowedRootPaths = formatGlobCollectionPattern(
    options.allowedRootPaths ?? PROJECT_DEFAULT_ALLOWED_ROOT_PATHS
  );

  const allowedExtensions = formatGlobCollectionPattern(
    options.allowedExtensions ?? PROJECT_DEFAULT_ALLOWED_EXTENSIONS
  );

  const projectFilesPattern = `./${allowedRootPaths}/**/*.${allowedExtensions}`;
  const patterns = [projectFilesPattern, ...PROJECT_DEFAULT_PATTERNS];

  const files = await glob(patterns, { cwd });

  const fFilesLength = f.highlight(files.length.toString());
  const fPattern = f.highlight(patterns.map((p) => `"${p}"`).join(', '));
  const fPath = f.path(cwd);

  logger.debug(`Found ${fFilesLength} files matching ${fPattern} in ${fPath}`);

  // Resolve the full paths for every file
  return files.map((file) => path.join(cwd, file));
};

/**
 * Transform the given string collection into a glob pattern.
 *
 * Single element are handled differently than collection with multiple items inside.
 *
 * Empty collections will throw an error.
 *
 * @example
 * formatGlobCollectionPattern(['foo', 'bar'])
 * // '{foo,bar}'
 * formatGlobCollectionPattern(['foo'])
 * // 'foo'
 * formatGlobCollectionPattern([])
 * // Error 'Invalid pattern provided, the given collection needs at least 1 element'
 */
const formatGlobCollectionPattern = (collection: string[]): string => {
  assert(
    collection.length > 0,
    'Invalid pattern provided, the given collection needs at least 1 element'
  );

  return collection.length === 1 ? collection[0] : `{${collection}}`;
};

const parseStrapiVersion = (
  packageJSON: MinimalPackageJSON,
  options: ProjectLoaderOptions
): SemVer => {
  const { cwd, logger } = options;

  const strapiVersion =
    // First try to get the strapi version from the package.json dependencies
    findStrapiVersionFromProjectPackageJSON(packageJSON, options) ??
    // If the version found is not a valid SemVer, get the Strapi version from the installed package
    findLocallyInstalledStrapiVersion(packageJSON, options);

  // At this point, we are sure to have a semver-compliant Strapi version. (else it would've thrown an error)

  const fStrapiVersion = f.version(strapiVersion);
  const fPath = f.path(cwd);

  logger.debug(
    `Resolved the "${F_STRAPI_DEPENDENCY_NAME}" dependency (${fStrapiVersion}) for ${fPath}`
  );

  return strapiVersion;
};

const findStrapiVersionFromProjectPackageJSON = (
  packageJSON: MinimalPackageJSON,
  options: ProjectLoaderOptions
): SemVer | undefined => {
  const { logger } = options;
  const fProjectName = f.highlight(packageJSON.name);

  const version = packageJSON.dependencies?.[STRAPI_DEPENDENCY_NAME];

  if (version === undefined) {
    throw new Error(
      `No version of ${F_STRAPI_DEPENDENCY_NAME} was found in ${fProjectName}. Are you in a valid Strapi project?`
    );
  }

  if (!isSemVer(version)) {
    const fInvalidSemVer = chalk.italic.red(version);
    logger.debug(
      `Found a ${F_STRAPI_DEPENDENCY_NAME} dependency in ${fProjectName}, but it's not a valid semver: ${fInvalidSemVer}`
    );

    // We return undefined only if a strapi/strapi version is found, but it's not semver compliant
    return undefined;
  }

  const fVersion = f.version(version);
  logger.debug(
    `Found a valid ${F_STRAPI_DEPENDENCY_NAME} version in the package.json dependencies: ${fVersion}`
  );

  return version;
};

const findLocallyInstalledStrapiVersion = (
  packageJSON: MinimalPackageJSON,
  options: ProjectLoaderOptions
): SemVer => {
  const { cwd, logger } = options;
  const fProjectPath = f.path(cwd);
  const fProjectName = f.highlight(packageJSON.name);

  const packageSearchText = `${STRAPI_DEPENDENCY_NAME}/package.json`;

  let strapiPackageJSONPath: string;
  let strapiPackageJSON: MinimalPackageJSON;

  try {
    logger.debug(
      `Trying to find a local installation of ${F_STRAPI_DEPENDENCY_NAME} for ${fProjectName} (${fProjectPath})`
    );

    strapiPackageJSONPath = require.resolve(packageSearchText, { paths: [cwd] });
    strapiPackageJSON = require(strapiPackageJSONPath);

    assert(typeof strapiPackageJSON === 'object');
  } catch {
    throw new Error(
      `Cannot find a "${F_STRAPI_DEPENDENCY_NAME}" dependency with a valid "package.json" file installed for ${cwd}`
    );
  }

  const fLocalInstallPath = f.path(strapiPackageJSONPath);

  const strapiVersion = strapiPackageJSON.version;
  const isValidSemVer = isSemVer(strapiVersion);

  if (!isValidSemVer) {
    const fInvalidVersion = chalk.red(strapiVersion);
    throw new Error(
      `Invalid ${F_STRAPI_DEPENDENCY_NAME} version found in ${fLocalInstallPath} (${fInvalidVersion})`
    );
  }

  logger.debug(
    `Found a local installation of ${F_STRAPI_DEPENDENCY_NAME} (${fLocalInstallPath}) for ${fProjectName}`
  );

  return strapiVersion;
};

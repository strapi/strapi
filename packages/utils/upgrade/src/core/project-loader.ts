import glob from 'glob';
import path from 'node:path';
import assert from 'node:assert';
import fs from 'node:fs/promises';

import * as f from './format';

import type { Logger } from './logger';
import type { SemVer } from '.';

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

const PROJECT_PACKAGE_JSON = 'package.json';
const PROJECT_DEFAULT_ALLOWED_ROOT_PATHS = ['src', 'config', 'public'];
const PROJECT_DEFAULT_ALLOWED_EXTENSIONS = ['js', 'ts', 'json'];
const STRAPI_DEPENDENCY_NAME = '@strapi/strapi';

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

  const packagePath = path.join(cwd, PROJECT_PACKAGE_JSON);

  try {
    await fs.access(packagePath);
  } catch {
    throw new Error(`Could not find a ${f.highlight(PROJECT_PACKAGE_JSON)} file in ${f.path(cwd)}`);
  }

  const buffer = await fs.readFile(packagePath);
  const packageJSON = JSON.parse(buffer.toString());

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

  const pattern = `./${allowedRootPaths}/**/*.${allowedExtensions}`;

  const files = await new Promise<string[]>((resolve, reject) => {
    glob(pattern, { cwd }, (err, matches) => (err ? reject(err) : resolve(matches)));
  });

  const fFilesLength = f.highlight(files.length.toString());
  const fPattern = f.highlight(pattern);
  const fPath = f.path(cwd);

  logger.debug(`Found ${fFilesLength} files matching "${fPattern}" in ${fPath}`);

  return files;
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

// TODO: Don't use the project version but look at the @strapi dependencies instead
// ?: What strategy should we adopt if there are multiple @strapi dependencies with different versions?
//     - Use latest?
//     - Use @strapi/strapi one? <- Seems like the best choice for the moment
const parseStrapiVersion = (packageJSON: any, options: ProjectLoaderOptions): SemVer => {
  const { cwd, logger } = options;

  const dependencies = packageJSON.dependencies ?? {};
  const strapiVersion = dependencies[STRAPI_DEPENDENCY_NAME] as SemVer | undefined;

  if (strapiVersion === undefined) {
    throw new Error(
      `No version of "${STRAPI_DEPENDENCY_NAME}" was found in the project's package.json. Are you in a valid Strapi project?`
    );
  }

  const fDependencyName = f.highlight(STRAPI_DEPENDENCY_NAME);
  const fStrapiVersion = f.version(strapiVersion);
  const fPath = f.path(cwd);

  logger.debug(`Found a "${fDependencyName}" dependency (${fStrapiVersion}) in ${fPath}`);

  return strapiVersion;
};

import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import inquirer from 'inquirer';
import semver, { SemVer } from 'semver';
import resolveFrom from 'resolve-from';
import readPkgUp, { PackageJson } from 'read-pkg-up';
import type { BuildOptions } from '../build';

/**
 * From V5 this will be imported from the package.json of `@strapi/strapi`.
 */
const PEER_DEPS = {
  react: '^18',
  'react-dom': '^18',
  'react-router-dom': '^5',
  'styled-components': '^5.3',
};

interface CheckRequiredDependenciesResult {
  didInstall: boolean;
}

/**
 * Checks the user's project that it has declared and installed the required dependencies
 * needed by the Strapi admin project. Whilst generally speaking most modules will be
 * declared by the actual packages there are some packages where you only really want one of
 * and thus they are declared as peer dependencies – react / styled-components / etc.
 *
 * If these deps are not installed or declared, then we prompt the user to correct this. In
 * V4 this is not a hard requirement, but in V5 it will be. Might as well get people started now.
 */
const checkRequiredDependencies = async ({
  cwd,
  logger,
}: Pick<BuildOptions, 'cwd' | 'logger'>): Promise<CheckRequiredDependenciesResult> => {
  const pkg = await readPkgUp({ cwd });

  if (!pkg) {
    throw new Error(`Could not find package.json at path: ${cwd}`);
  }

  logger.debug('Loaded package.json:', os.EOL, pkg.packageJson);

  interface DepToReview {
    name: string;
    wantedVersion: string;
    declaredVersion: string;
  }

  interface DepToInstall {
    name: string;
    wantedVersion: string;
    declaredVersion?: never;
  }

  /**
   * Run through each of the peer deps and figure out if they need to be
   * installed or they need their version checked against.
   */
  const { install, review } = Object.entries(PEER_DEPS).reduce<{
    install: DepToInstall[];
    review: DepToReview[];
  }>(
    (acc, [name, version]) => {
      if (!pkg.packageJson.dependencies) {
        throw new Error(`Could not find dependencies in package.json at path: ${cwd}`);
      }

      const declaredVersion = pkg.packageJson.dependencies[name];

      if (!declaredVersion) {
        acc.install.push({
          name,
          wantedVersion: version,
        });
      } else {
        acc.review.push({
          name,
          wantedVersion: version,
          declaredVersion,
        });
      }

      return acc;
    },
    {
      install: [],
      review: [],
    }
  );

  if (install.length > 0) {
    logger.info(
      'The Strapi admin needs to install the following dependencies:',
      os.EOL,
      install.map(({ name, wantedVersion }) => `  - ${name}@${wantedVersion}`).join(os.EOL)
    );
    /**
     * This prompt can be removed in V5 & therefore the code underneath can be refactored to
     * only install the deps and return that we installed deps.
     */
    const { install: installAns } = await inquirer.prompt({
      type: 'confirm',
      name: 'install',
      default: true,
      message:
        'Would you like to install these dependencies now? These are not required but are recommended, from V5 these will be required.',
    });

    if (installAns && process.env.NODE_ENV === 'development') {
      /**
       * TODO: Add an install deps command here. We need to resolve the package manager to do this & we also
       * need to re-run this command because the node_modules shape could have changed post installation.
       * So for now log an error and tell them to install them manually.
       */
      throw new Error(
        'Please install the dependencies manually and then re-run this command, we have not implemented this yet.'
      );
    } else {
      return { didInstall: false };
    }
  }

  if (review.length) {
    const errors: string[] = [];

    for (const dep of review) {
      // The version specified in package.json could be incorrect, eg `foo`
      let minDeclaredVersion: SemVer | null = null;
      try {
        minDeclaredVersion = semver.minVersion(dep.declaredVersion);
      } catch (err) {
        // Intentional fall-through (variable will be left as null, throwing below)
      }

      if (!minDeclaredVersion) {
        errors.push(
          `The declared dependency, ${dep.name} has an invalid version in package.json: ${dep.declaredVersion}`
        );
      } else if (!semver.satisfies(minDeclaredVersion, dep.wantedVersion)) {
        /**
         * The delcared version should be semver compatible with our required version
         * of the dependency. If it's not, we should advise the user to change it.
         */
        logger.warn(
          [
            `Declared version of ${dep.name} (${minDeclaredVersion}) is not compatible with the version required by Strapi (${dep.wantedVersion}).`,
            'You may experience issues, we recommend you change this.',
          ].join(os.EOL)
        );
      }

      const installedVersion = await getModuleVersion(dep.name, cwd);

      if (!installedVersion) {
        /**
         * TODO: when we know the packageManager we can advise the actual install command.
         */
        errors.push(
          `The declared dependency, ${dep.name} is not installed. You should install before re-running this command`
        );
      } else if (!semver.satisfies(installedVersion, dep.wantedVersion)) {
        logger.warn(
          [
            `Declared version of ${dep.name} (${installedVersion}) is not compatible with the version required by Strapi (${dep.wantedVersion}).`,
            'You may experience issues, we recommend you change this.',
          ].join(os.EOL)
        );
      }
    }

    if (errors.length > 0 && process.env.NODE_ENV === 'development') {
      throw new Error(`${os.EOL}- ${errors.join(`${os.EOL}- `)}`);
    }
  }

  return { didInstall: false };
};

const getModule = async (name: string, cwd: string): Promise<PackageJson | null> => {
  const modulePackagePath = resolveFrom.silent(cwd, path.join(name, 'package.json'));
  if (!modulePackagePath) {
    return null;
  }
  const file = await fs.readFile(modulePackagePath, 'utf8').then((res) => JSON.parse(res));

  return file;
};

const getModuleVersion = async (name: string, cwd: string): Promise<string | null> => {
  const pkg = await getModule(name, cwd);

  return pkg?.version || null;
};

export { checkRequiredDependencies, getModule };
export type { CheckRequiredDependenciesResult, PackageJson };

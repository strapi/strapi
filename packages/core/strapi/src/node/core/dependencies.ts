import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import semver, { SemVer } from 'semver';
import resolveFrom from 'resolve-from';
import execa, { CommonOptions, ExecaReturnValue } from 'execa';
import readPkgUp, { PackageJson } from 'read-pkg-up';
import type { BuildOptions } from '../build';
import { getPackageManager } from './managers';

/**
 * From V5 this will be imported from the package.json of `@strapi/strapi`.
 */
const PEER_DEPS = {
  react: '^18.0.0',
  'react-dom': '^18.0.0',
  'react-router-dom': '^6.0.0',
  'styled-components': '^6.0.0',
};

interface CheckRequiredDependenciesResult {
  didInstall: boolean;
}

interface DepToInstall {
  name: string;
  wantedVersion: string;
  declaredVersion?: never;
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
  /**
   * This enables us to use experimental deps for libraries like
   * react or styled-components. This is useful for testing against.
   */
  if (process.env.USE_EXPERIMENTAL_DEPENDENCIES === 'true') {
    logger.warn('You are using experimental dependencies that may not be compatible with Strapi.');
    return { didInstall: false };
  }

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

    await installDependencies(install, {
      cwd,
      logger,
    });

    const [file, ...args] = process.argv;

    /**
     * Re-run the same command after installation e.g. strapi build because the yarn.lock might
     * not be the same and could break installations. It's not the best solution, but it works.
     */
    await execa(file, args, { cwd, stdio: 'inherit' });
    return { didInstall: true };
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

const installDependencies = async (
  install: DepToInstall[],
  { cwd, logger }: Pick<BuildOptions, 'cwd' | 'logger'>
) => {
  const packageManager = getPackageManager();

  if (!packageManager) {
    logger.error(
      'Could not find a supported package manager, please install the dependencies manually.'
    );
    process.exit(1);
  }

  const execOptions: CommonOptions<'utf8'> = {
    encoding: 'utf8',
    cwd,
    stdio: 'inherit',
  };

  const packages = install.map(({ name, wantedVersion }) => `${name}@${wantedVersion}`);

  let result: ExecaReturnValue<string> | undefined;

  if (packageManager === 'npm') {
    const npmArgs = ['install', '--legacy-peer-deps', '--save', ...packages];
    logger.info(`Running 'npm ${npmArgs.join(' ')}'`);
    result = await execa('npm', npmArgs, execOptions);
  } else if (packageManager === 'yarn') {
    const yarnArgs = ['add', ...packages];
    logger.info(`Running 'yarn ${yarnArgs.join(' ')}'`);
    result = await execa('yarn', yarnArgs, execOptions);
  } else if (packageManager === 'pnpm') {
    const pnpmArgs = ['add', '--save-prod', ...packages];
    logger.info(`Running 'pnpm ${pnpmArgs.join(' ')}'`);
    result = await execa('pnpm', pnpmArgs, execOptions);
  }

  if (result?.exitCode || result?.failed) {
    throw new Error('Package installation failed');
  }
};

export { checkRequiredDependencies, getModule };
export type { CheckRequiredDependenciesResult, PackageJson };

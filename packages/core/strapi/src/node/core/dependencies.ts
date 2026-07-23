import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import semver, { SemVer } from 'semver';
import resolveFrom from 'resolve-from';
import execa, { CommonOptions, ExecaReturnValue } from 'execa';
import readPkgUp, { PackageJson } from 'read-pkg-up';

import type { Logger } from '../../cli/utils/logger';
import { getPackageManager } from './managers';

const CACHE_PATH = path.join('node_modules', '.strapi', 'deps-check.hash');

const hashPackageJson = async (cwd: string): Promise<string | null> => {
  try {
    const content = await fs.readFile(path.join(cwd, 'package.json'), 'utf8');
    return crypto.createHash('sha1').update(content).digest('hex');
  } catch {
    return null;
  }
};

const readCachedHash = (cwd: string): Promise<string | null> =>
  fs.readFile(path.join(cwd, CACHE_PATH), 'utf8').catch(() => null);

const writeCachedHash = async (cwd: string, hash: string): Promise<void> => {
  try {
    await fs.mkdir(path.dirname(path.join(cwd, CACHE_PATH)), { recursive: true });
    await fs.writeFile(path.join(cwd, CACHE_PATH), hash, 'utf8');
  } catch {
    // best-effort cache write — silently ignore
  }
};

/**
 * From V5 this will be imported from the package.json of `@strapi/strapi`.
 */
const ADMIN_PEER_DEPS = {
  react: '^18.0.0',
  'react-dom': '^18.0.0',
  'react-router-dom': '^6.0.0',
  'styled-components': '^6.0.0',
} as const;

interface AdminPeerDep {
  name: string;
  wantedVersion: string;
}

interface DeclaredAdminPeerDep extends AdminPeerDep {
  declaredVersion: string;
}

class MissingAdminPeerDepsError extends Error {
  readonly missing: AdminPeerDep[];

  constructor(missing: AdminPeerDep[]) {
    super('Missing required dependencies. Please install them and re-run this command.');
    this.name = 'MissingAdminPeerDepsError';
    this.missing = missing;
  }
}

const loadProjectPackageJson = async (cwd: string) => {
  const pkg = await readPkgUp({ cwd });

  if (!pkg) {
    throw new Error(`Could not find package.json at path: ${cwd}`);
  }

  if (!pkg.packageJson.dependencies) {
    throw new Error(`Could not find dependencies in package.json at path: ${cwd}`);
  }

  return pkg;
};

/**
 * Returns admin peer dependencies that are not declared in the project's package.json.
 */
const findUndeclaredAdminPeerDeps = async (cwd: string): Promise<AdminPeerDep[]> => {
  const pkg = await loadProjectPackageJson(cwd);

  return Object.entries(ADMIN_PEER_DEPS).reduce<AdminPeerDep[]>((missing, [name, version]) => {
    const declaredVersion =
      pkg.packageJson.dependencies?.[name] ?? pkg.packageJson.devDependencies?.[name];

    if (!declaredVersion) {
      missing.push({
        name,
        wantedVersion: version,
      });
    }

    return missing;
  }, []);
};

const getDeclaredAdminPeerDeps = (packageJson: PackageJson): DeclaredAdminPeerDep[] => {
  return Object.entries(ADMIN_PEER_DEPS).reduce<DeclaredAdminPeerDep[]>(
    (declared, [name, version]) => {
      const declaredVersion =
        packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name];

      if (declaredVersion) {
        declared.push({
          name,
          wantedVersion: version,
          declaredVersion,
        });
      }

      return declared;
    },
    []
  );
};

const getInstallCommandHint = (missing: AdminPeerDep[]) => {
  const packages = missing.map(({ name, wantedVersion }) => `${name}@${wantedVersion}`).join(' ');
  const packageManager = getPackageManager();

  if (packageManager === 'yarn') {
    return `yarn add ${packages}`;
  }

  if (packageManager === 'pnpm') {
    return `pnpm add --save-prod ${packages}`;
  }

  // Do not use --legacy-peer-deps: it rewrites package-lock in a mode that
  // breaks plain `npm ci` (#27019). Fresh apps install cleanly without it.
  return `npm install --save ${packages}`;
};

const reportMissingAdminPeerDeps = (logger: Logger, missing: AdminPeerDep[]) => {
  logger.error(
    'The Strapi admin is missing required dependencies:',
    os.EOL,
    missing.map(({ name, wantedVersion }) => `  - ${name}@${wantedVersion}`).join(os.EOL)
  );
  logger.error(
    'Please install them manually before re-running this command:',
    os.EOL,
    `  ${getInstallCommandHint(missing)}`
  );
};

/**
 * Validates declared admin peer dependencies (versions and node_modules presence).
 */
const validateDeclaredAdminPeerDeps = async (cwd: string, logger: Logger) => {
  const pkg = await loadProjectPackageJson(cwd);
  const declared = getDeclaredAdminPeerDeps(pkg.packageJson);

  if (!declared.length) {
    return;
  }

  logger.debug('Loaded package.json:', os.EOL, pkg.packageJson);

  const errors: string[] = [];

  for (const dep of declared) {
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
      logger.warn(
        [
          `Declared version of ${dep.name} (${minDeclaredVersion}) is not compatible with the version required by Strapi (${dep.wantedVersion}).`,
          'You may experience issues, we recommend you change this.',
        ].join(os.EOL)
      );
    }

    const installedVersion = await getModuleVersion(dep.name, cwd);

    if (!installedVersion) {
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
};

const installAdminPeerDeps = async (
  missing: AdminPeerDep[],
  { cwd, logger }: { cwd: string; logger: Logger }
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

  const packages = missing.map(({ name, wantedVersion }) => `${name}@${wantedVersion}`);

  let result: ExecaReturnValue<string> | undefined;

  if (packageManager === 'npm') {
    const npmArgs = ['install', '--save', ...packages];
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

const reexecCurrentCommand = async (cwd: string) => {
  const [file, ...args] = process.argv;

  /**
   * Re-run the same command after installation e.g. strapi build because the yarn.lock might
   * not be the same and could break installations. It's not the best solution, but it works.
   */
  await execa(file, args, { cwd, stdio: 'inherit' });
};

const getModule = async (name: string, cwd: string): Promise<PackageJson | null> => {
  const modulePackagePath = resolveFrom.silent(cwd, path.join(name, 'package.json'));

  if (modulePackagePath) {
    const file = await fs.readFile(modulePackagePath, 'utf8').then((res) => JSON.parse(res));

    return file;
  }

  // Restrictive `exports` maps may omit `./package.json`; resolve the package entry instead.
  const entryPath = resolveFrom.silent(cwd, name);

  if (entryPath) {
    const result = await readPkgUp({ cwd: path.dirname(entryPath) });
    const packageJson = result?.packageJson;

    // Reject walk-ups / alias installs where the manifest name does not match the request
    // (e.g. `"foo": "npm:bar@1"` must not be treated as package `foo`).
    if (!packageJson || (packageJson.name && packageJson.name !== name)) {
      return null;
    }

    return packageJson;
  }

  return null;
};

const getModuleVersion = async (name: string, cwd: string): Promise<string | null> => {
  const pkg = await getModule(name, cwd);

  return pkg?.version || null;
};

export {
  ADMIN_PEER_DEPS,
  findUndeclaredAdminPeerDeps,
  validateDeclaredAdminPeerDeps,
  installAdminPeerDeps,
  reexecCurrentCommand,
  reportMissingAdminPeerDeps,
  getInstallCommandHint,
  MissingAdminPeerDepsError,
  getModule,
  hashPackageJson,
  readCachedHash,
  writeCachedHash,
};
export type { AdminPeerDep, PackageJson };

import path from 'path';
import fse from 'fs-extra';
import execa from 'execa';
import { packageManager as packageManagerUtils } from '@strapi/utils';

import { EnterpriseInstallError } from './errors';

export type PackageManagerName = 'npm' | 'pnpm' | 'yarn';

/** Yarn's major version matters: Yarn 2 and later read another configuration file. */
export type DetectedPackageManager =
  | { name: 'npm' | 'pnpm'; majorVersion?: number }
  | { name: 'yarn'; majorVersion: number };

/** Reads a `packageManager` field such as `yarn@4.5.0` or `pnpm@9.1.0+sha512...`. */
export const parsePackageManagerField = (
  packageManagerField: unknown
): DetectedPackageManager | undefined => {
  if (typeof packageManagerField !== 'string') {
    return undefined;
  }

  const fieldMatch = packageManagerField.match(/^(npm|pnpm|yarn)@(\d+)/);

  if (!fieldMatch) {
    return undefined;
  }

  return { name: fieldMatch[1] as PackageManagerName, majorVersion: Number(fieldMatch[2]) };
};

const YARN_VERSION_UNKNOWN =
  'Could not run yarn --version to tell Yarn 1 from Yarn 2+. Check that Yarn is installed, or set "packageManager" in package.json.';

const readYarnMajorVersion = async (appDir: string): Promise<number> => {
  const { stdout } = await execa('yarn', ['--version'], { cwd: appDir }).catch(() => {
    throw new EnterpriseInstallError(YARN_VERSION_UNKNOWN);
  });
  const majorVersion = Number.parseInt(stdout.trim(), 10);

  // Guessing Yarn 1 would set up a file that Yarn 2+ never reads.
  if (Number.isNaN(majorVersion)) {
    throw new EnterpriseInstallError(YARN_VERSION_UNKNOWN);
  }

  return majorVersion;
};

export const detectPackageManager = async (appDir: string): Promise<DetectedPackageManager> => {
  const packageJson = await fse.readJson(path.join(appDir, 'package.json')).catch(() => ({}));
  const packageManagerFromField = parsePackageManagerField(packageJson.packageManager);

  if (packageManagerFromField) {
    return packageManagerFromField;
  }

  // Detection reads the lockfile, then `node_modules`, and throws when it finds neither, as in a
  // fresh clone whose dependencies are not installed yet.
  const packageManagerName = await packageManagerUtils.getPreferred(appDir).catch(() => {
    throw new EnterpriseInstallError(
      'Could not tell which package manager this app uses. Install its dependencies first, or set "packageManager" in package.json.'
    );
  });

  if (packageManagerName === 'yarn') {
    return { name: 'yarn', majorVersion: await readYarnMajorVersion(appDir) };
  }

  return { name: packageManagerName };
};

/**
 * Yarn 2 and later read `.yarnrc.yml`. npm, pnpm, and Yarn 1 read `.npmrc`.
 */
export const readsYarnrcYml = (packageManager: DetectedPackageManager): boolean =>
  packageManager.name === 'yarn' && packageManager.majorVersion >= 2;

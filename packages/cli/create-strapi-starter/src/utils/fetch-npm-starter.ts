import path from 'path';
import execa from 'execa';
import chalk from 'chalk';

import stopProcess from './stop-process';

import type { PackageInfo, PackageManager } from '../types';

/**
 * Gets the package version on npm. Will fail if the package does not exist
 */
async function getPackageInfo(
  packageName: string,
  packageManager: PackageManager
): Promise<PackageInfo> {
  const { stdout } = await execa(packageManager, ['info', packageName, '--json']);

  const pkgInfo = JSON.parse(stdout);

  if (pkgInfo.data) {
    return {
      name: pkgInfo.data.name,
      version: pkgInfo.data.version,
    };
  }

  return {
    name: pkgInfo.name,
    version: pkgInfo.version,
  };
}

/**
 * Get the version and full package name of the starter
 */
export async function getStarterPackageInfo(
  starter: string,
  packageManager: PackageManager
): Promise<PackageInfo> {
  // Check if starter is a shorthand
  try {
    const longhand = `@strapi/starter-${starter}`;
    return await getPackageInfo(longhand, packageManager);
  } catch (error) {
    // Ignore error, we now know it's not a shorthand
  }
  // Fetch version of the non-shorthand package
  try {
    return await getPackageInfo(starter, packageManager);
  } catch (error) {
    return stopProcess(`Could not find package ${chalk.yellow(starter)} on npm`);
  }
}

/**
 * Download a starter package from the npm registry
 */
export async function downloadNpmStarter(
  packageInfo: PackageInfo,
  parentDir: string,
  packageManager: PackageManager
): Promise<string> {
  const { name, version } = packageInfo;

  await execa(packageManager, ['add', `${name}@${version}`, '--no-lockfile', '--silent'], {
    cwd: parentDir,
  });

  // Return the path of the actual starter
  const exactStarterPath = path.dirname(
    require.resolve(`${name}/package.json`, { paths: [parentDir] })
  );

  return exactStarterPath;
}

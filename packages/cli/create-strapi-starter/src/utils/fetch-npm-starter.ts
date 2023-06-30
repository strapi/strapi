import path from 'path';
import execa from 'execa';
import chalk from 'chalk';
import stopProcess from './stop-process';
import type { Options, PackageInfo } from '../types';

/**
 * Gets the package version on npm. Will fail if the package does not exist
 */
async function getPackageInfo(packageName: string, options?: Options): Promise<PackageInfo> {
  const { useYarn } = options ?? {};

  // Use yarn if possible because it's faster
  if (useYarn) {
    const { stdout } = await execa('yarn', ['info', packageName, '--json']);
    const yarnInfo = JSON.parse(stdout);
    return {
      name: yarnInfo.data.name,
      version: yarnInfo.data.version,
    };
  }

  // Fallback to npm
  const { stdout } = await execa('npm', ['view', packageName, 'name', 'version', '--silent']);
  // Use regex to parse name and version from CLI result
  const match = stdout.match(/(?<=')(.*?)(?=')/gm);

  if (!match) {
    throw new Error('No match for name@version');
  }

  const [name, version] = match;
  return { name, version };
}

/**
 * Get the version and full package name of the starter
 */
export async function getStarterPackageInfo(
  starter: string,
  options?: Options
): Promise<PackageInfo> {
  const { useYarn } = options ?? {};

  // Check if starter is a shorthand
  try {
    const longhand = `@strapi/starter-${starter}`;
    return await getPackageInfo(longhand, { useYarn });
  } catch (error) {
    // Ignore error, we now know it's not a shorthand
  }
  // Fetch version of the non-shorthand package
  try {
    return await getPackageInfo(starter, { useYarn });
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
  options?: Options
): Promise<string> {
  const { name, version } = packageInfo;
  const { useYarn } = options ?? {};

  // Download from npm, using yarn if possible
  if (useYarn) {
    await execa('yarn', ['add', `${name}@${version}`, '--no-lockfile', '--silent'], {
      cwd: parentDir,
    });
  } else {
    await execa('npm', ['install', `${name}@${version}`, '--no-save', '--silent'], {
      cwd: parentDir,
    });
  }

  // Return the path of the actual starter
  const exactStarterPath = path.dirname(
    require.resolve(`${name}/package.json`, { paths: [parentDir] })
  );
  return exactStarterPath;
}

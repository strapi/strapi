'use strict';

const path = require('path');
const execa = require('execa');
const chalk = require('chalk');
const stopProcess = require('./stop-process');

/**
 * Gets the package version on npm. Will fail if the package does not exist
 * @param {string} packageName Name to look up on npm, may include a specific version
 * @param {Object} options
 * @param {boolean} options.useYarn Yarn instead of npm
 * @returns {Object}
 */
async function getPackageInfo(packageName, { useYarn } = {}) {
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
  const [name, version] = stdout.match(/(?<=')(.*?)(?=')/gm);
  return { name, version };
}

/**
 * Get the version and full package name of the starter
 * @param {string} starter - The name of the starter as provided by the user
 * @param {Object} options
 * @param {boolean} options.useYarn - Use yarn instead of npm
 * @returns {Object} - Full name and version of the starter package on npm
 */
async function getStarterPackageInfo(starter, { useYarn } = {}) {
  // Check if starter is a shorthand
  try {
    const longhand = `@strapi/starter-${starter}`;
    const packageInfo = await getPackageInfo(longhand, { useYarn });
    // Hasn't crashed so it is indeed a shorthand
    return packageInfo;
  } catch (error) {
    // Ignore error, we now know it's not a shorthand
  }
  // Fetch version of the non-shorthand package
  try {
    return getPackageInfo(starter, { useYarn });
  } catch (error) {
    stopProcess(`Could not find package ${chalk.yellow(starter)} on npm`);
  }
}

/**
 * Download a starter package from the npm registry
 * @param {Object} packageInfo - Starter's npm package information
 * @param {string} packageInfo.name
 * @param {string} packageInfo.version
 * @param {string} parentDir - Path inside of which we install the starter
 * @param {Object} options
 * @param {boolean} options.useYarn - Use yarn instead of npm
 */
async function downloadNpmStarter({ name, version }, parentDir, { useYarn } = {}) {
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

module.exports = { getStarterPackageInfo, downloadNpmStarter };

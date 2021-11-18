'use strict';

const path = require('path');
const execa = require('execa');
const chalk = require('chalk');
const stopProcess = require('./stop-process');

/**
 * Gets the package version on npm. Will fail if the package does not exist
 * @param {string} packageName - Name to look up on npm, may include a specific version
 * @returns {Object}
 */
async function getPackageInfo(packageName) {
  const { stdout } = await execa.shell(`npm view ${packageName} name version --silent`);
  // Use regex to parse name and version from CLI result
  const [name, version] = stdout.match(/(?<=')(.*?)(?=')/gm);
  return { name, version };
}

/**
 * @param {string} starter - The name of the starter as provided by the user.
 * @returns {Object} - The full name of the starter package's name on npm
 */
async function getStarterPackageInfo(starter) {
  // Check if starter is a shorthand
  try {
    const longhand = `@strapi/starter-${starter}`;
    const packageInfo = await getPackageInfo(longhand);
    // Hasn't crashed so it is indeed a shorthand
    return packageInfo;
  } catch (error) {
    // Ignore error, we now know it's not a shorthand
  }
  // Fetch version of the non-shorthand package
  try {
    return getPackageInfo(starter);
  } catch (error) {
    stopProcess(`Could not find package ${chalk.green(starter)} on npm`);
  }
}

/**
 * @param {Object} packageInfo - Starter's npm package information
 * @param {string} packageInfo.name
 * @param {string} packageInfo.version
 * @param {string} parentDir - Path inside of which we install the starter.
 */
async function downloadNpmStarter({ name, version }, parentDir) {
  // Download from npm
  await execa.shell(`npm install ${name}@${version} --no-save --silent`, {
    cwd: parentDir,
  });

  // Return the path of the actual starter
  const exactStarterPath = path.dirname(
    require.resolve(`${name}/package.json`, { paths: [parentDir] })
  );
  return exactStarterPath;
}

module.exports = { getStarterPackageInfo, downloadNpmStarter };

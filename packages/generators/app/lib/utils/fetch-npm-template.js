'use strict';

const path = require('path');
const execa = require('execa');
const chalk = require('chalk');

/**
 * Gets the package version on npm. Will fail if the package does not exist
 * @param {string} packageName - Name to look up on npm, may include a specific version
 * @returns {Object}
 */
async function getPackageInfo(packageName) {
  const { stdout } = await execa('npm', ['view', packageName, 'name', 'version', '--silent']);
  // Use regex to parse name and version from CLI result
  const [name, version] = stdout.match(/(?<=')(.*?)(?=')/gm);
  return { name, version };
}

/**
 * @param {string} template - The name of the template as provided by the user.
 * @returns {Object} - The full name of the template package's name on npm
 */
async function getTemplatePackageInfo(template) {
  // Check if template is a shorthand
  try {
    const longhand = `@strapi/template-${template}`;
    const packageInfo = await getPackageInfo(longhand);
    // Hasn't crashed so it is indeed a shorthand
    return packageInfo;
  } catch (error) {
    // Ignore error, we now know it's not a shorthand
  }
  // Fetch version of the non-shorthand package
  try {
    return getPackageInfo(template);
  } catch (error) {
    throw new Error(`Could not find package ${chalk.yellow(template)} on npm`);
  }
}

/**
 * @param {Object} packageInfo - Template's npm package information
 * @param {string} packageInfo.name
 * @param {string} packageInfo.version
 * @param {string} parentDir - Path inside of which we install the template.
 */
async function downloadNpmTemplate({ name, version }, parentDir) {
  // Download from npm
  await execa('npm', ['install', `${name}@${version}`, '--no-save', '--silent'], {
    cwd: parentDir,
  });

  // Return the path of the actual template
  const exactTemplatePath = path.dirname(
    require.resolve(`${name}/package.json`, { paths: [parentDir] })
  );
  return exactTemplatePath;
}

module.exports = { getTemplatePackageInfo, downloadNpmTemplate };

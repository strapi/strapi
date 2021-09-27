'use strict';

const execSync = require('child_process').execSync;
const path = require('path');
// const fetch = require('node-fetch');
const chalk = require('chalk');

/**
 * Gets the package version on npm. Will fail if the package does not exist
 * @param {string} packageName - Name to look up on npm, may include a specific version
 * @returns {Object}
 */
function getPackageInfo(packageName) {
  const npmInfo = execSync(`npm view ${packageName} name version --silent`).toString();
  // Use regex to parse name and version from CLI result
  const [name, version] = npmInfo.match(/(?<=')(.*?)(?=')/gm);
  return { name, version };
}

/**
 * @param {string} template - The name of the template as provided by the user. Can be a shorthand.
 * @returns {Object} - The full name of the template package's name on npm
 */
async function getTemplatePackageInfo(template) {
  // Check if template is a s horthand
  try {
    const longhand = `@strapi/template-${template}`;
    const packageInfo = getPackageInfo(longhand);
    // Hasn't crashed so it is indeed a shorthand
    return packageInfo;
  } catch (error) {
    // Ignore error, we now know it's not a shorthand
  }
  // Fetch version of the non-shorthand package
  try {
    return getPackageInfo(template);
  } catch (error) {
    throw new Error(`Could not find package ${chalk.green('template.json')} on npm`);
  }
}

/**
 * @param {Object} packageInfo - Template's npm package information
 * @param {string} packageInfo.name
 * @param {string} packageInfo.version
 * @param {string} parentDir - Path inside of which we install the template.
 */
function downloadNpmTemplate({ name, version }, parentDir) {
  // Download from npm
  execSync(`cd ${parentDir} && npm install ${name}@${version} --no-save --silent`).toString();

  // Return the path of the actual template
  const exactTemplatePath = path.resolve(parentDir, 'node_modules', name);
  return exactTemplatePath;
}

module.exports = { getTemplatePackageInfo, downloadNpmTemplate };

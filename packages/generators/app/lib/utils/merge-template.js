'use strict';

const os = require('os');
const path = require('path');
const fse = require('fs-extra');
const _ = require('lodash/fp');
const chalk = require('chalk');
const { getTemplatePackageInfo, downloadNpmTemplate } = require('./fetch-npm-template');

// Specify all the files and directories a template can have
const allowFile = Symbol('alloFile');
const allowChildren = Symbol('allowChildren');
const allowedTemplateContents = {
  'README.md': allowFile,
  '.env.example': allowFile,
  'package.json': allowFile,
  src: allowChildren,
  data: allowChildren,
  database: allowChildren,
  public: allowChildren,
  scripts: allowChildren,
};

/**
 * Merge template with new project being created
 * @param {string} scope  project creation params
 * @param {string} rootPath  project path
 */
module.exports = async function mergeTemplate(scope, rootPath) {
  let templatePath;
  let templateParentPath;
  let templatePackageInfo = {};
  const isLocalTemplate = ['./', '../', '/'].some((filePrefix) =>
    scope.template.startsWith(filePrefix)
  );

  if (isLocalTemplate) {
    // Template is a local directory
    console.log('Installing local template.');
    templatePath = path.resolve(rootPath, '..', scope.template);
  } else {
    // Template should be an npm package. Fetch template info
    templatePackageInfo = await getTemplatePackageInfo(scope.template);
    console.log(`Installing ${chalk.yellow(templatePackageInfo.name)} template.`);

    // Download template repository to a temporary directory
    templateParentPath = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-'));
    templatePath = await downloadNpmTemplate(templatePackageInfo, templateParentPath);
  }

  // Make sure the downloaded template matches the required format
  const templateConfig = await checkTemplateRootStructure(templatePath, scope);
  await checkTemplateContentsStructure(path.resolve(templatePath, 'template'));

  // Merge contents of the template in the project
  await mergePackageJSON({ rootPath, templateConfig, templatePackageInfo });
  await mergeFilesAndDirectories(rootPath, templatePath);

  // Delete the template directory if it was downloaded
  if (!isLocalTemplate) {
    await fse.remove(templateParentPath);
  }
};

/**
 * Make sure the template has the required top-level structure
 * @param {string} templatePath - Path of the locally downloaded template
 * @returns {Object} - The template config object
 */
async function checkTemplateRootStructure(templatePath) {
  // Make sure the root of the repo has a template.json file
  const templateJsonPath = path.join(templatePath, 'template.json');
  const templateJsonExists = await fse.exists(templateJsonPath);
  if (!templateJsonExists) {
    throw new Error(`A template must have a ${chalk.green('template.json')} root file`);
  }
  const templateJsonStat = await fse.stat(templateJsonPath);
  if (!templateJsonStat.isFile()) {
    throw new Error(`A template's ${chalk.green('template.json')} must be a file`);
  }

  const templateConfig = require(templateJsonPath);

  // Make sure the root of the repo has a template folder
  const templateDirPath = path.join(templatePath, 'template');
  try {
    const stat = await fse.stat(templateDirPath);
    if (!stat.isDirectory()) {
      throw Error(`A template must have a root ${chalk.green('template/')} directory`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw Error(`A template must have a root ${chalk.green('template/')} directory`);
    }

    throw error;
  }

  return templateConfig;
}

/**
 * Traverse template tree to make sure each file and folder is allowed
 * @param {string} templateContentsPath
 */
async function checkTemplateContentsStructure(templateContentsPath) {
  // Recursively check if each item in a directory is allowed
  const checkPathContents = async (pathToCheck, parents) => {
    const contents = await fse.readdir(pathToCheck);
    for (const item of contents) {
      const nextParents = [...parents, item];
      const matchingTreeValue = _.get(nextParents, allowedTemplateContents);

      // Treat files and directories separately
      const itemPath = path.resolve(pathToCheck, item);
      const isDirectory = (await fse.stat(itemPath)).isDirectory();

      if (matchingTreeValue === undefined) {
        // Unknown paths are forbidden
        throw Error(
          `Illegal template structure, unknown path ${chalk.green(nextParents.join('/'))}`
        );
      }

      if (matchingTreeValue === allowFile) {
        if (!isDirectory) {
          // All good, the file is allowed
          return;
        }
        throw Error(
          `Illegal template structure, expected a file and got a directory at ${chalk.green(
            nextParents.join('/')
          )}`
        );
      }

      if (isDirectory) {
        if (matchingTreeValue === allowChildren) {
          // All children are allowed
          return;
        }
        // Check if the contents of the directory are allowed
        await checkPathContents(itemPath, nextParents);
      } else {
        throw Error(
          `Illegal template structure, unknown file ${chalk.green(nextParents.join('/'))}`
        );
      }
    }
  };

  await checkPathContents(templateContentsPath, []);
}

/**
 * Merge the template's template.json into the Strapi project's package.json
 * @param {Object} config
 * @param {string} config.rootPath
 * @param {string} config.templateConfig
 * @param {Object} config.templatePackageInfo - Info about the template's package on npm
 * @param {Object} config.templatePackageInfo.name - The name of the template's package on npm
 * @param {Object} config.templatePackageInfo.version - The name of the template's package on npm
 */
async function mergePackageJSON({ rootPath, templateConfig, templatePackageInfo }) {
  // Import the package.json as an object
  const packageJSON = require(path.resolve(rootPath, 'package.json'));

  if (!templateConfig.package) {
    // Nothing to overwrite
    return;
  }

  // Make sure the template.json doesn't overwrite the UUID
  if (templateConfig.package.strapi && templateConfig.package.strapi.uuid) {
    throw Error('A template cannot overwrite the Strapi UUID');
  }

  // Use lodash to deeply merge them
  const mergedConfig = _.merge(templateConfig.package, packageJSON);

  // Add template info to package.json
  if (templatePackageInfo.name) {
    _.set('strapi.template', templatePackageInfo.name, mergedConfig);
  }

  // Save the merged config as the new package.json
  const packageJSONPath = path.join(rootPath, 'package.json');
  await fse.writeJSON(packageJSONPath, mergedConfig, { spaces: 2 });
}

// Merge all allowed files and directories
async function mergeFilesAndDirectories(rootPath, templatePath) {
  const templateDir = path.join(templatePath, 'template');
  await fse.copy(templateDir, rootPath, { overwrite: true, recursive: true });
}

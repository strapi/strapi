'use strict';

const os = require('os');
const path = require('path');
const fse = require('fs-extra');
const _ = require('lodash');
const chalk = require('chalk');

const { getRepoInfo, downloadGitHubRepo } = require('./fetch-github');

// Specify all the files and directories a template can have
const allowChildren = '*';
const allowedTemplateContents = {
  'README.md': true,
  '.env.example': true,
  api: allowChildren,
  components: allowChildren,
  config: {
    functions: allowChildren,
  },
  data: allowChildren,
  plugins: allowChildren,
  public: allowChildren,
  scripts: allowChildren,
};

/**
 * merge template with new project being created
 * @param {string} scope  project creation params
 * @param {string} rootPath  project path
 */
module.exports = async function mergeTemplate(scope, rootPath) {
  // Parse template info
  const repoInfo = await getRepoInfo(scope.template);
  const { fullName } = repoInfo;
  console.log(`Installing ${chalk.yellow(fullName)} template.`);

  // Download template repository to a temporary directory
  const templatePath = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-'));
  await downloadGitHubRepo(repoInfo, templatePath);

  // Make sure the downloaded template matches the required format
  const { templateConfig } = await checkTemplateRootStructure(templatePath, scope);
  await checkTemplateContentsStructure(path.resolve(templatePath, 'template'));

  // Merge contents of the template in the project
  const fullTemplateUrl = `https://github.com/${fullName}`;
  await mergePackageJSON(rootPath, templateConfig, fullTemplateUrl);
  await mergeFilesAndDirectories(rootPath, templatePath);

  // Delete the downloaded template repo
  await fse.remove(templatePath);
};

// Make sure the template has the required top-level structure
async function checkTemplateRootStructure(templatePath, scope) {
  // Make sure the root of the repo has a template.json or a template.js file
  const templateJsonPath = path.join(templatePath, 'template.json');
  const templateFunctionPath = path.join(templatePath, 'template.js');

  // Store the template config, whether it comes from a JSON or a function
  let templateConfig = {};

  const hasJsonConfig = fse.existsSync(templateJsonPath);
  if (hasJsonConfig) {
    const jsonStat = await fse.stat(templateJsonPath);
    if (!jsonStat.isFile()) {
      throw new Error(`A template's ${chalk.green('template.json')} must be a file`);
    }
    templateConfig = require(templateJsonPath);
  }

  const hasFunctionConfig = fse.existsSync(templateFunctionPath);
  if (hasFunctionConfig) {
    const functionStat = await fse.stat(templateFunctionPath);
    if (!functionStat.isFile()) {
      throw new Error(`A template's ${chalk.green('template.js')} must be a file`);
    }
    // Get the config by passing the scope to the function
    templateConfig = require(templateFunctionPath)(scope);
  }

  // Make sure there's exactly one template config file
  if (!hasJsonConfig && !hasFunctionConfig) {
    throw new Error(
      `A template must have either a ${chalk.green('template.json')} or a ${chalk.green(
        'template.js'
      )} root file`
    );
  } else if (hasJsonConfig && hasFunctionConfig) {
    throw new Error(
      `A template cannot have both ${chalk.green('template.json')} and ${chalk.green(
        'template.js'
      )} root files`
    );
  }

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

  return { templateConfig };
}

// Traverse template tree to make sure each file and folder is allowed
async function checkTemplateContentsStructure(templateContentsPath) {
  // Recursively check if each item in a directory is allowed
  const checkPathContents = (pathToCheck, parents) => {
    const contents = fse.readdirSync(pathToCheck);
    contents.forEach(item => {
      const nextParents = [...parents, item];
      const matchingTreeValue = _.get(allowedTemplateContents, nextParents);

      // Treat files and directories separately
      const itemPath = path.resolve(pathToCheck, item);
      const isDirectory = fse.statSync(itemPath).isDirectory();

      if (matchingTreeValue === undefined) {
        // Unknown paths are forbidden
        throw Error(
          `Illegal template structure, unknown path ${chalk.green(nextParents.join('/'))}`
        );
      }

      if (matchingTreeValue === true) {
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
        checkPathContents(itemPath, nextParents);
      } else {
        throw Error(
          `Illegal template structure, unknow file ${chalk.green(nextParents.join('/'))}`
        );
      }
    });
  };

  checkPathContents(templateContentsPath, []);
}

// Merge the template's template.json into the Strapi project's package.json
async function mergePackageJSON(rootPath, templateConfig, templateUrl) {
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
  const mergedConfig = _.merge(packageJSON, templateConfig.package);

  // Add starter info to package.json
  _.set(mergedConfig, 'strapi.template', templateUrl);

  // Save the merged config as the new package.json
  const packageJSONPath = path.join(rootPath, 'package.json');
  await fse.writeJSON(packageJSONPath, mergedConfig, { spaces: 2 });
}

// Merge all allowed files and directories
async function mergeFilesAndDirectories(rootPath, templatePath) {
  const templateDir = path.join(templatePath, 'template');
  await fse.copy(templateDir, rootPath, { overwrite: true, recursive: true });
}

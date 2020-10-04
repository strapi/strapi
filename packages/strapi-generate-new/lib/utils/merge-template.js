'use strict';

const os = require('os');
const path = require('path');
const fse = require('fs-extra');
const fetch = require('node-fetch');
const tar = require('tar');
const _ = require('lodash');
const chalk = require('chalk');
const gitInfo = require('hosted-git-info');

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
 * @param {string} templateUrl  tempalte github url
 * @param {string} rootPath  project path
 */
module.exports = async function mergeTemplate(templateUrl, rootPath) {
  // Parse template info
  const repoInfo = getRepoInfo(templateUrl);
  const { user, project } = repoInfo;
  console.log(`Installing ${chalk.yellow(`${user}/${project}`)} template.`);

  // Download template repository to a temporary directory
  const templatePath = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-'));

  try {
    await downloadGithubRepo(repoInfo, templatePath);
  } catch (error) {
    throw Error(`Could not download ${chalk.yellow(`${user}/${project}`)} repository.`);
  }

  // Make sure the downloaded template matches the required format
  await checkTemplateRootStructure(templatePath);
  await checkTemplateContentsStructure(path.resolve(templatePath, 'template'));

  // Merge contents of the template in the project
  await mergePackageJSON(rootPath, templatePath, templateUrl);
  await mergeFilesAndDirectories(rootPath, templatePath);

  // Delete the downloaded template repo
  await fse.remove(templatePath);
};

// Make sure the template has the required top-level structure
async function checkTemplateRootStructure(templatePath) {
  // Make sure the root of the repo has a template.json and a template/ folder
  const templateJsonPath = path.join(templatePath, 'template.json');
  try {
    const stat = await fse.stat(templateJsonPath);
    if (!stat.isFile()) {
      throw Error(`A template must have a root ${chalk.green('template.json')} file`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw Error(`A template must have a root ${chalk.green('template.json')} file`);
    }

    throw error;
  }

  // Make sure the root of the repo has a template.json and a template/ folder
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

function getRepoInfo(githubURL) {
  const { type, user, project } = gitInfo.fromUrl(githubURL);
  // Make sure it's a github url
  if (type !== 'github') {
    throw Error('A Strapi template can only be a GitHub URL');
  }

  return { user, project };
}

async function downloadGithubRepo(repoInfo, templatePath) {
  // Download from GitHub
  const { user, project } = repoInfo;
  const codeload = `https://codeload.github.com/${user}/${project}/tar.gz/master`;
  const response = await fetch(codeload);

  await new Promise(resolve => {
    response.body.pipe(tar.extract({ strip: 1, cwd: templatePath })).on('close', resolve);
  });
}

// Merge the template's template.json into the Strapi project's package.json
async function mergePackageJSON(rootPath, templatePath, templateUrl) {
  // Import the package.json and template.json objects
  const packageJSON = require(path.resolve(rootPath, 'package.json'));
  const templateJSON = require(path.resolve(templatePath, 'template.json'));

  if (!templateJSON.package) {
    // Nothing to overwrite
    return;
  }

  // Make sure the template.json doesn't overwrite the UUID
  if (templateJSON.package.strapi && templateJSON.package.strapi.uuid) {
    throw Error('A template cannot overwrite the Strapi UUID');
  }

  // Use lodash to deeply merge them
  const mergedConfig = _.merge(packageJSON, templateJSON.package);

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

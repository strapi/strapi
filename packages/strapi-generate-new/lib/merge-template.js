'use strict';

const path = require('path');
const fse = require('fs-extra');
const fetch = require('node-fetch');
const unzip = require('unzip-stream');
const _ = require('lodash');

// Specify all the files and directories a template can have
const allowChildren = '*';
const allowedTemplateTree = {
  // Root template files
  'template.json': true,
  'README.md': true,
  '.gitignore': true,
  // Template contents
  template: {
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
  },
};

// Traverse template tree to make sure each file and folder is allowed
async function checkTemplateStructure(templatePath) {
  // Recursively check if each item in the template is allowed
  const checkPathContents = (pathToCheck, parents) => {
    const contents = fse.readdirSync(pathToCheck);
    contents.forEach(item => {
      const nextParents = [...parents, item];
      const matchingTreeValue = _.get(allowedTemplateTree, nextParents);

      // Treat files and directories separately
      const itemPath = path.resolve(pathToCheck, item);
      const isDirectory = fse.statSync(itemPath).isDirectory();

      if (matchingTreeValue === undefined) {
        // Unknown paths are forbidden
        throw Error(`Illegal template structure, unknown path ${nextParents.join('/')}`);
      }

      if (matchingTreeValue === true) {
        if (!isDirectory) {
          // All good, the file is allowed
          return;
        }
        throw Error(
          `Illegal template structure, expected a file and got a directory at ${nextParents.join(
            '/'
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
        throw Error(`Illegal template structure, unknow file ${nextParents.join('/')}`);
      }
    });
  };

  checkPathContents(templatePath, []);
}

function getRepoInfo(githubURL) {
  // Make sure it's a github url
  const address = githubURL.split('://')[1];
  if (!address.startsWith('github.com')) {
    throw Error('A Strapi template can only be a GitHub URL');
  }

  // Parse github address into parts
  const [, username, name, ...rest] = address.split('/');
  const isRepo = username != null && name != null;
  if (!isRepo || rest.length > 0) {
    throw Error('A template URL must be the root of a GitHub repository');
  }

  return { username, name };
}

async function downloadGithubRepo(repoInfo, rootPath) {
  const { username, name, branch = 'master' } = repoInfo;
  const codeload = `https://codeload.github.com/${username}/${name}/zip/${branch}`;
  const templatePath = path.resolve(rootPath, 'tmp-template');
  const response = await fetch(codeload);
  await new Promise(resolve => {
    response.body.pipe(unzip.Extract({ path: templatePath })).on('close', resolve);
  });

  return templatePath;
}

// Merge the template's template.json into the Strapi project's package.json
async function mergePackageJSON(rootPath, templatePath, repoInfo) {
  // Import the package.json and template.json templates
  const packageJSON = require(path.resolve(rootPath, 'package.json'));
  const templateJSON = require(path.resolve(templatePath, 'template.json'));

  // Make sure the template.json doesn't overwrite the UUID
  if (templateJSON.strapi && templateJSON.strapi.uuid) {
    throw Error('A template cannot overwrite the Strapi UUID');
  }

  // Use lodash to deeply merge them
  const mergedConfig = _.merge(packageJSON, templateJSON);

  // Prefix Strapi UUID with starter info
  const prefix = `STARTER:${repoInfo.username}/${repoInfo.name}:`;
  mergedConfig.strapi = {
    uuid: prefix + mergedConfig.strapi.uuid,
  };

  // Save the merged config as the new package.json
  await fse.writeJSON(path.resolve(rootPath, 'package.json'), mergedConfig, {
    spaces: 2,
  });
}

// Merge all allowed files and directories
async function mergeFilesAndDirectories(rootPath, templatePath) {
  const copyPromises = fse
    .readdirSync(path.resolve(templatePath, 'template'))
    .map(async fileOrDir => {
      // Copy the template contents from the downloaded template to the Strapi project
      await fse.copy(
        path.resolve(templatePath, 'template', fileOrDir),
        path.resolve(rootPath, fileOrDir),
        { overwrite: true, recursive: true }
      );
    });
  await Promise.all(copyPromises);
}

module.exports = async function mergeTemplate(templateUrl, rootPath) {
  // Download template repository to a temporary directory
  const repoInfo = getRepoInfo(templateUrl);
  console.log(`Installing ${repoInfo.username}/${repoInfo.name} template.`);
  const templateParentPath = await downloadGithubRepo(repoInfo, rootPath);
  const templatePath = path.resolve(templateParentPath, fse.readdirSync(templateParentPath)[0]);

  // Make sure the downloaded template matches the required format
  await checkTemplateStructure(templatePath);

  // Merge contents of the template in the project
  await mergePackageJSON(rootPath, templatePath, repoInfo);
  await mergeFilesAndDirectories(rootPath, templatePath);

  // Delete the downloaded template repo
  await fse.remove(templateParentPath);
};

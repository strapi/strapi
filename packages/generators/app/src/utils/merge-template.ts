/* eslint-disable @typescript-eslint/no-var-requires */
import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import _ from 'lodash/fp';
import chalk from 'chalk';
import { getTemplatePackageInfo, downloadNpmTemplate } from './fetch-npm-template';
import type { PackageInfo, Scope, TemplateConfig } from '../types';

interface ErrorWithCode extends Error {
  code?: string;
}

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

// Merge template with new project being created
export default async function mergeTemplate(scope: Scope, rootPath: string) {
  if (!scope.template) {
    throw new Error('Missing template');
  }

  let templatePath;
  let templateParentPath;
  let templatePackageInfo: PackageInfo | undefined;
  const isLocalTemplate = ['./', '../', '/'].some((filePrefix) =>
    scope.template?.startsWith(filePrefix)
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
  const templateConfig = await checkTemplateRootStructure(templatePath);
  await checkTemplateContentsStructure(path.resolve(templatePath, 'template'));

  // Merge contents of the template in the project
  await mergePackageJSON({ rootPath, templateConfig, templatePackageInfo });
  await mergeFilesAndDirectories(rootPath, templatePath);

  // Delete the template directory if it was downloaded
  if (!isLocalTemplate && templateParentPath) {
    await fse.remove(templateParentPath);
  }
}

// Make sure the template has the required top-level structure
async function checkTemplateRootStructure(templatePath: string): Promise<TemplateConfig> {
  // Make sure the root of the repo has a template.json file
  const templateJsonPath = path.join(templatePath, 'template.json');
  const templateJsonExists = await fse.pathExists(templateJsonPath);
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
    if (error instanceof Error && (error as ErrorWithCode).code === 'ENOENT') {
      throw Error(`A template must have a root ${chalk.green('template/')} directory`);
    }

    throw error;
  }

  return templateConfig;
}

// Traverse template tree to make sure each file and folder is allowed
async function checkTemplateContentsStructure(templateContentsPath: string) {
  // Recursively check if each item in a directory is allowed
  const checkPathContents = async (pathToCheck: string, parents: string[]) => {
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
// Merge the template's template.json into the Strapi project's package.json
async function mergePackageJSON({
  rootPath,
  templateConfig,
  templatePackageInfo,
}: {
  rootPath: string;
  templateConfig: TemplateConfig;
  templatePackageInfo: PackageInfo | undefined;
}) {
  // Import the package.json as an object
  const packageJSON = require(path.resolve(rootPath, 'package.json'));

  if (!templateConfig.package) {
    // Nothing to overwrite
    return;
  }

  // Make sure the template.json doesn't overwrite the UUID
  if (_.has('strapi.uuid', templateConfig.package)) {
    throw Error('A template cannot overwrite the Strapi UUID');
  }

  // Use lodash to deeply merge them
  const mergedConfig = _.merge(templateConfig.package, packageJSON);

  // Add template info to package.json
  if (templatePackageInfo?.name) {
    _.set('strapi.template', templatePackageInfo.name, mergedConfig);
  }

  // Save the merged config as the new package.json
  const packageJSONPath = path.join(rootPath, 'package.json');
  await fse.writeJSON(packageJSONPath, mergedConfig, { spaces: 2 });
}

// Merge all allowed files and directories
async function mergeFilesAndDirectories(rootPath: string, templatePath: string) {
  const templateDir = path.join(templatePath, 'template');
  await fse.copy(templateDir, rootPath, { overwrite: true, recursive: true });
}

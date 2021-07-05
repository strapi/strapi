'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const chalk = require('chalk');
const fse = require('fs-extra');

const { trackUsage } = require('./utils/usage');
const stopProcess = require('./utils/stop-process');
const createCLIDatabaseProject = require('./create-cli-db-project');
const createCustomizeProject = require('./create-customized-project');
const createQuickStartProject = require('./create-quickstart-project');

module.exports = async scope => {
  const hasDatabaseConfig = Boolean(scope.database);

  // check rootPath is empty
  if (await fse.exists(scope.rootPath)) {
    const stat = await fse.stat(scope.rootPath);

    if (!stat.isDirectory()) {
      stopProcess(
        `⛔️ ${chalk.green(
          scope.rootPath
        )} is not a directory. Make sure to create a Strapi application in an empty directory.`
      );
    }

    const files = await fse.readdir(scope.rootPath);
    if (files.length > 1) {
      stopProcess(
        `⛔️ You can only create a Strapi app in an empty directory.\nMake sure ${chalk.green(
          scope.rootPath
        )} is empty.`
      );
    }
  }

  await trackUsage({ event: 'willCreateProject', scope });

  // if database config is provided don't test the connection and create the project directly
  if (hasDatabaseConfig) {
    return createCLIDatabaseProject(scope);
  }

  // if cli quickstart create project with default sqlite options
  if (scope.quick === true) {
    return createQuickStartProject(scope);
  }
  // create a project with full list of questions
  return createCustomizeProject(scope);
};

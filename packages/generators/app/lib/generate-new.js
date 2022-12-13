'use strict';

/**
 * Module dependencies
 */

const { trackUsage } = require('./utils/usage.js');
const checkInstallPath = require('./utils/check-install-path.js');
const createCLIDatabaseProject = require('./create-cli-db-project.js');
const createCustomizedProject = require('./create-customized-project.js');
const createQuickStartProject = require('./create-quickstart-project.js');

module.exports = async (scope) => {
  const hasDatabaseConfig = Boolean(scope.database);

  // check rootPath is empty
  checkInstallPath(scope.rootPath);

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
  return createCustomizedProject(scope);
};

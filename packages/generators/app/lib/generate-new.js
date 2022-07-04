'use strict';

/**
 * Module dependencies
 */

const ampli = require('@strapi/telemetry/server');
const { trackUsage } = require('./utils/usage');
const checkInstallPath = require('./utils/check-install-path');
const createCLIDatabaseProject = require('./create-cli-db-project');
const createCustomizeProject = require('./create-customized-project');
const createQuickStartProject = require('./create-quickstart-project');

module.exports = async scope => {
  const hasDatabaseConfig = Boolean(scope.database);

  // check rootPath is empty
  checkInstallPath(scope.rootPath);

  await ampli.willCreateProject('', {}, {}, { source: 'generators', send: trackUsage, scope });
  // await trackUsage({ event: 'willCreateProject', scope });

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

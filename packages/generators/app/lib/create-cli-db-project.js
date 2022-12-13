'use strict';

const { merge } = require('lodash');

const { trackUsage } = require('./utils/usage.js');
const defaultConfigs = require('./utils/db-configs.js');
const clientDependencies = require('./utils/db-client-dependencies.js');
const getClientName = require('./utils/db-client-name.js');
const createProject = require('./create-project.js');

module.exports = async (scope) => {
  console.log('Creating a project from the database CLI arguments.');
  await trackUsage({ event: 'didChooseCustomDatabase', scope });

  const { client } = scope.database;
  const configuration = {
    client: getClientName({ client }),
    connection: merge({}, defaultConfigs[client] || {}, scope.database),
    dependencies: clientDependencies({ scope, client }),
  };

  return createProject(scope, configuration);
};

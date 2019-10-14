'use strict';

const execa = require('execa');

const stopProcess = require('./utils/stop-process');
const { trackUsage, captureError } = require('./utils/usage');
const defaultConfigs = require('./utils/db-configs.js');
const clientDependencies = require('./utils/db-client-dependencies.js');
const createProject = require('./create-project');

module.exports = async function createQuickStartProject(scope) {
  console.log('Creating a quickstart project.');
  await trackUsage({ event: 'didChooseQuickstart', scope });

  // get default sqlite config
  const client = 'sqlite';
  const configuration = {
    client,
    connection: defaultConfigs[client],
    dependencies: clientDependencies({ scope, client }),
  };

  await createProject(scope, configuration);

  if (scope.runQuickstartApp !== true) return;

  try {
    await trackUsage({ event: 'willBuildAdmin', scope });

    await execa('npm', ['run', 'build'], {
      stdio: 'inherit',
      cwd: scope.rootPath,
      env: {
        FORCE_COLOR: 1,
      },
    });

    await trackUsage({ event: 'didBuildAdmin', scope });
  } catch (error) {
    await trackUsage({
      event: 'didNotBuildAdmin',
      scope,
      error: error.stderr.slice(-1024),
    });

    error.stderr
      .trim()
      .split('\n')
      .forEach(line => {
        console.error(line);
      });

    await captureError(new Error('didNotBuildAdmin'));

    stopProcess('Stopping');
  }

  console.log(`Running your Strapi application.`);

  try {
    await trackUsage({ event: 'willStartServer', scope });

    await execa('npm', ['run', 'develop'], {
      stdio: 'inherit',
      cwd: scope.rootPath,
      env: {
        FORCE_COLOR: 1,
      },
    });
  } catch (error) {
    await trackUsage({
      event: 'didNotStartServer',
      scope,
      error: error.stderr.slice(-1024),
    });

    error.stderr
      .trim()
      .split('\n')
      .forEach(line => {
        console.error(line);
      });

    await captureError(new Error('didNotStartServer'));

    stopProcess('Stopping');
  }
};

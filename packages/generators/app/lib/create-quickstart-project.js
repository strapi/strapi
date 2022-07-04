'use strict';

const execa = require('execa');
const ampli = require('@strapi/telemetry/server');
// FIXME
/* eslint-disable import/extensions */
const { trackUsage, captureStderr } = require('./utils/usage');
const defaultConfigs = require('./utils/db-configs.js');
const clientDependencies = require('./utils/db-client-dependencies.js');
const createProject = require('./create-project');

module.exports = async function createQuickStartProject(scope) {
  console.log('Creating a quickstart project.');
  await ampli.didChooseQuickstart('', {}, {}, { source: 'generators', send: trackUsage, scope });
  // await trackUsage({ event: 'didChooseQuickstart', scope });

  // get default sqlite config
  const client = 'sqlite';
  const configuration = {
    client,
    connection: defaultConfigs[client],
    dependencies: clientDependencies({ scope, client }),
  };

  await createProject(scope, configuration);

  if (scope.runQuickstartApp !== true) return;

  console.log(`Running your Strapi application.`);

  try {
    await ampli.willStartServer('', {}, {}, { source: 'generators', send: trackUsage, scope });
    // await trackUsage({ event: 'willStartServer', scope });

    await execa('npm', ['run', 'develop'], {
      stdio: 'inherit',
      cwd: scope.rootPath,
      env: {
        FORCE_COLOR: 1,
      },
    });
  } catch (error) {
    await ampli.didNotStartServer('', {}, {}, { source: 'generators', send: trackUsage, scope });
    // await trackUsage({
    //   event: 'didNotStartServer',
    //   scope,
    //   error,
    // });

    await captureStderr('didNotStartServer', error);
    process.exit(1);
  }
};

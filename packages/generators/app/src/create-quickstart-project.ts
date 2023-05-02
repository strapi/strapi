import execa from 'execa';
import { trackUsage, captureStderr } from './utils/usage';
import defaultConfigs from './utils/db-configs.js';
import clientDependencies from './utils/db-client-dependencies.js';
import createProject from './create-project';
import type { Configuration, Scope } from './types';

export default async function createQuickStartProject(scope: Scope) {
  console.log('Creating a quickstart project.');
  await trackUsage({ event: 'didChooseQuickstart', scope });

  // get default sqlite config
  const client = 'sqlite';
  const configuration: Configuration = {
    client,
    connection: defaultConfigs[client],
    dependencies: clientDependencies({ client }),
  };

  await createProject(scope, configuration);

  if (scope.runQuickstartApp !== true) return;

  console.log(`Running your Strapi application.`);

  try {
    await trackUsage({ event: 'willStartServer', scope });

    await execa('npm', ['run', 'develop'], {
      stdio: 'inherit',
      cwd: scope.rootPath,
      env: {
        FORCE_COLOR: '1',
      },
    });
  } catch (error) {
    if (typeof error === 'string' || error instanceof Error) {
      await trackUsage({
        event: 'didNotStartServer',
        scope,
        error,
      });

      await captureStderr('didNotStartServer', error);
    }
    process.exit(1);
  }
}

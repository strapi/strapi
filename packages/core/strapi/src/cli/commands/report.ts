import { createCommand } from 'commander';
import { EOL } from 'os';
import { createStrapi, compileStrapi } from '@strapi/core';
import type { StrapiCommand } from '../types';
import { runAction } from '../utils/helpers';

interface CmdOptions {
  uuid: boolean;
  dependencies: boolean;
  all: boolean;
}

const action = async ({ uuid, dependencies, all }: CmdOptions) => {
  const config = {
    reportUUID: Boolean(all || uuid),
    reportDependencies: Boolean(all || dependencies),
  };

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).register();

  let debugInfo = `Launched In: ${Date.now() - app.config.get<number>('launchedAt')} ms
Environment: ${app.config.get<string>('environment')}
OS: ${process.platform}-${process.arch}
Strapi Version: ${app.config.get<string>('info.strapi')}
Node/Yarn Version: ${process.env.npm_config_user_agent}
Edition: ${app.EE ? 'Enterprise' : 'Community'}
Database: ${app.config.get<string | undefined>('database.connection.client') ?? 'unknown'}`;

  if (config.reportUUID) {
    debugInfo += `${EOL}UUID: ${app.config.get<string>('uuid')}`;
  }

  if (config.reportDependencies) {
    const dependencies = JSON.stringify(app.config.get('info.dependencies'), null, 2);
    const devDependencies = JSON.stringify(app.config.get('info.devDependencies'), null, 2);
    debugInfo += `${EOL}Dependencies: ${dependencies}
Dev Dependencies: ${devDependencies}`;
  }

  console.log(debugInfo);

  await app.destroy();
};

/**
 * `$ strapi report`
 */
const command: StrapiCommand = () => {
  return createCommand('report')
    .description('Get system stats for debugging and submitting issues')
    .option('-u, --uuid', 'Include Project UUID')
    .option('-d, --dependencies', 'Include Project Dependencies')
    .option('--all', 'Include All Information')
    .action(runAction('report', action));
};

export { action, command };

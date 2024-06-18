import { join, resolve, basename } from 'node:path';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import readline from 'node:readline';
import crypto from 'crypto';

import checkRequirements from './utils/check-requirements';
import { trackError, trackUsage } from './utils/usage';
import machineID from './utils/machine-id';
import type { Scope, Options } from './types';

import checkInstallPath from './utils/check-install-path';
import createProject from './create-project';
import { addDatabaseDependencies } from './utils/database';

export type { Options };
export { default as checkInstallPath } from './utils/check-install-path';
export { default as checkRequirements } from './utils/check-requirements';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

export const generateNewApp = async (options: Options) => {
  checkRequirements();

  const rootPath = await checkInstallPath(options.directory);

  const tmpPath = join(os.tmpdir(), `strapi${crypto.randomBytes(6).toString('hex')}`);

  const scope: Scope = {
    rootPath,
    name: basename(rootPath),
    useTypescript: options.useTypescript,
    packageManager: options.packageManager,
    database: options.database,
    runApp: options.runApp ?? false,
    isQuickstart: options.isQuickstart,
    // use package version as strapiVersion (all packages have the same version);
    strapiVersion: packageJson.version,
    template: options.useExampleApp ? 'example' : options.template, // Force example template if useExampleApp option === true
    useExampleApp: options.useExampleApp,
    packageJsonStrapi: {
      template: options.template,
    },
    uuid: (process.env.STRAPI_UUID_PREFIX || '') + crypto.randomUUID(),
    docker: process.env.DOCKER === 'true',
    deviceId: machineID(),
    tmpPath,
    installDependencies: true,
    devDependencies: {},
    dependencies: {
      '@strapi/strapi': packageJson.version,
      '@strapi/plugin-users-permissions': packageJson.version,
      '@strapi/plugin-cloud': packageJson.version,
      // third party
      react: '^18.0.0',
      'react-dom': '^18.0.0',
      'react-router-dom': '^6.0.0',
      'styled-components': '^6.0.0',
    },
  };

  if (scope.useTypescript) {
    scope.devDependencies = {
      ...scope.devDependencies,
      typescript: '^5',
      '@types/node': '^20',
      '@types/react': '^18',
      '@types/react-dom': '^18',
    };
  }

  addDatabaseDependencies(scope);

  initCancelCatcher();

  try {
    await trackUsage({ event: 'willCreateProject', scope });

    // create a project with full list of questions
    return await createProject(scope);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    console.log(`\n${error.message}\n`);

    return trackError({ scope, error }).then(() => {
      process.exit(1);
    });
  }
};

function initCancelCatcher() {
  // Create interface for windows user to let them quit the program.
  if (process.platform === 'win32') {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on('SIGINT', function sigint() {
      process.emit('SIGINT');
    });
  }

  process.on('SIGINT', () => {
    process.exit(1);
  });
}

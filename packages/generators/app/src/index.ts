import { join, resolve, basename } from 'node:path';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import readline from 'node:readline';
import crypto from 'crypto';
import * as sentry from '@sentry/node';
import hasYarn from './utils/has-yarn';
import checkRequirements from './utils/check-requirements';
import { trackError, captureException } from './utils/usage';
import parseDatabaseArguments from './utils/parse-db-arguments';
import generateNew from './generate-new';
import machineID from './utils/machine-id';
import type { Scope, NewOptions } from './types';

export { default as checkInstallPath } from './utils/check-install-path';

sentry.init({
  dsn: 'https://841d2b2c9b4d4b43a4cde92794cb705a@sentry.io/1762059',
});

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

export const generateNewApp = (projectDirectory: string, options: Partial<NewOptions>) => {
  checkRequirements();

  const rootPath = resolve(projectDirectory);

  const tmpPath = join(os.tmpdir(), `strapi${crypto.randomBytes(6).toString('hex')}`);

  const useNpm = options.useNpm !== undefined;

  const scope: Scope = {
    rootPath,
    name: basename(rootPath),
    // disable quickstart run app after creation
    runQuickstartApp: options.run !== false,
    // use pacakge version as strapiVersion (all packages have the same version);
    strapiVersion: packageJson.version,
    debug: options.debug !== undefined,
    quick: options.quickstart,
    template: options.template,
    packageJsonStrapi: {
      template: options.template,
      starter: options.starter,
    },
    uuid: (process.env.STRAPI_UUID_PREFIX || '') + crypto.randomUUID(),
    docker: process.env.DOCKER === 'true',
    deviceId: machineID(),
    tmpPath,
    // use yarn if available and --use-npm isn't true
    useYarn: !useNpm && hasYarn(),
    installDependencies: true,
    strapiDependencies: [
      '@strapi/strapi',
      '@strapi/plugin-users-permissions',
      '@strapi/plugin-i18n',
    ],
    additionalsDependencies: {},
    useTypescript: Boolean(options.typescript),
  };

  sentry.configureScope(function configureScope(sentryScope) {
    const tags = {
      os: os.type(),
      osPlatform: os.platform(),
      osArch: os.arch(),
      osRelease: os.release(),
      version: scope.strapiVersion,
      nodeVersion: process.versions.node,
      docker: scope.docker,
    };

    (Object.keys(tags) as Array<keyof typeof tags>).forEach((tag) => {
      sentryScope.setTag(tag, tags[tag]);
    });
  });

  parseDatabaseArguments({ scope, args: options });
  initCancelCatcher();

  return generateNew(scope).catch((error) => {
    console.error(error);
    return captureException(error).then(() => {
      return trackError({ scope, error }).then(() => {
        process.exit(1);
      });
    });
  });
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

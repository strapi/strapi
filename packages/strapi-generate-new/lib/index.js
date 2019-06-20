'use strict';

const { join, resolve, basename } = require('path');
const os = require('os');
const crypto = require('crypto');
const chalk = require('chalk');
const { machineIdSync } = require('node-machine-id');
const uuid = require('uuid/v4');
const execa = require('execa');

const generateNew = require('./generate-new');
const { trackError, trackUsage } = require('./utils/usage');
const stopProcess = require('./utils/stop-process');

module.exports = (projectDirectory, cliArguments) => {
  const rootPath = resolve(projectDirectory);

  const tmpPath = join(
    os.tmpdir(),
    `strapi${crypto.randomBytes(6).toString('hex')}`
  );

  const scope = {
    rootPath,
    name: basename(rootPath),
    // use pacakge version as strapiVersion (all packages have the same version);
    strapiVersion: require('../package.json').version,
    debug: cliArguments.debug !== undefined,
    quick: cliArguments.quickstart !== undefined,
    uuid: uuid(),
    deviceId: machineIdSync(),
    tmpPath,
    hasYarn: hasYarn(),
    strapiDependencies: [
      'strapi',
      'strapi-admin',
      'strapi-utils',
      'strapi-plugin-settings-manager',
      'strapi-plugin-content-type-builder',
      'strapi-plugin-content-manager',
      'strapi-plugin-users-permissions',
      'strapi-plugin-email',
      'strapi-plugin-upload',
    ],
    additionalsDependencies: {},
  };

  parseDatabaseArguments({ scope, args: cliArguments });
  initCancelCatcher(scope);

  console.log(`Creating a new Strapi application in ${chalk.green(rootPath)}.`);
  console.log();

  return generateNew(scope).catch(error => {
    console.error(error);
    return trackError({ scope, error }).then(() => {
      process.exit(1);
    });
  });
};

const dbArguments = [
  'dbclient',
  'dbhost',
  'dbport',
  'dbname',
  'dbusername',
  'dbpassword',
];

function parseDatabaseArguments({ scope, args }) {
  const argKeys = Object.keys(args);
  const matchingDbArguments = dbArguments.filter(key => argKeys.includes(key));

  if (matchingDbArguments.length === 0) return;

  if (
    matchingDbArguments.length !== dbArguments.length &&
    args.dbclient !== 'sqlite'
  ) {
    return stopProcess(
      `⛔️ Some database arguments are missing. Required arguments list: ${dbArguments}`
    );
  }

  scope.dbforce = args.dbforce !== undefined;

  const database = {
    settings: {
      client: args.dbclient,
      host: args.dbhost,
      srv: args.dbsrv,
      port: args.dbport,
      database: args.dbname,
      username: args.dbusername,
      password: args.dbpassword,
      filename: args.dbfile,
    },
    options: {},
  };

  if (args.dbauth !== undefined) {
    database.options.authenticationDatabase = args.dbauth;
  }

  if (args.dbssl !== undefined) {
    if (args.dbclient === 'mongo') {
      database.options.ssl = args.dbssl === 'true';
    } else {
      database.settings.ssl = args.dbssl === 'true';
    }
  }

  scope.database = database;
}

function initCancelCatcher(scope) {
  // Create interface for windows user to let them quit the program.
  if (process.platform === 'win32') {
    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on('SIGINT', function() {
      process.emit('SIGINT');
    });
  }

  process.on('SIGINT', () => {
    console.log('Cancelling');

    trackUsage({ event: 'didStopCreateProject', scope }).then(() => {
      process.exit();
    });
  });
}

function hasYarn() {
  try {
    const { code } = execa.shellSync('yarnpkg --version');
    if (code === 0) return true;
    return false;
  } catch (err) {
    return false;
  }
}

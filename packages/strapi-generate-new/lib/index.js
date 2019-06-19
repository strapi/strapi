'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const { join, resolve, basename } = require('path');
const { merge, pick } = require('lodash');
const os = require('os');
const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');
const uuid = require('uuid/v4');
const inquirer = require('inquirer');
const execa = require('execa');

// Local dependencies.
const packageJSON = require('./resources/json/package.json');
const databaseJSON = require('./resources/json/database.json.js');

const { trackError, trackUsage } = require('./usage');
const dbQuestions = require('./db-questions');
const fse = require('fs-extra');

/**
 * Copy required files for the generated application
 */

const defaultConfigs = {
  sqlite: {
    connector: 'strapi-hook-bookshelf',
    settings: {
      client: 'sqlite',
      filename: '.tmp/data.db',
    },
    options: {
      useNullAsDefault: true,
    },
  },
  postgres: {
    connector: 'strapi-hook-bookshelf',
    settings: {
      client: 'postgres',
    },
  },
  mysql: {
    connector: 'strapi-hook-bookshelf',
    settings: {
      client: 'mysql',
    },
  },
  mongo: {
    connector: 'strapi-hook-mongoose',
  },
};

const sqlClientModule = {
  sqlite: 'sqlite3',
  postgres: 'pg',
  mysql: 'mysql',
};

const clientDependencies = ({ scope, client }) => {
  switch (client) {
    case 'sqlite':
    case 'postgres':
    case 'mysql':
      return {
        'strapi-hook-bookshelf': scope.strapiVersion,
        'strapi-hook-knex': scope.strapiVersion,
        knex: 'latest',
        [sqlClientModule[client]]: 'latest',
      };
    case 'mongo':
      return {
        'strapi-hook-mongoose': scope.strapiVersion,
      };
    default:
      throw new Error(`Invalid client ${client}`);
  }
};

module.exports = async (location, cliArguments = {}) => {
  console.log('🚀 Creating your Strapi application.\n');

  const { debug = false, quickstart = false } = cliArguments;

  // Build scope.
  const rootPath = resolve(location);

  const tmpPath = join(
    os.tmpdir(),
    `strapi${crypto.randomBytes(6).toString('hex')}`
  );

  const scope = {
    rootPath,
    name: basename(rootPath),
    // use pacakge version as strapiVersion (all packages have the same version);
    strapiVersion: require('../package.json').version,
    debug: debug !== false,
    quick: quickstart !== false,
    uuid: 'testing', //uuid(),
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
  initCancelCatcher();

  await trackUsage({ event: 'willCreateProject', scope });

  const hasDatabaseConfig = Boolean(scope.database);

  // check rootPath is empty
  if (await fse.exists(scope.rootPath)) {
    const stat = await fse.stat(scope.rootPath);

    if (!stat.isDirectory()) {
      await trackError({ scope, error: 'Path is not a directory' });

      stopProcess(
        `⛔️ ${
          scope.rootPath
        } is not a directory. Make sure to create a Strapi application in an empty directory.`
      );
    }

    const files = await fse.readdir(scope.rootPath);
    if (files.length > 1) {
      await trackError({ scope, error: 'Directory is not empty' });
      stopProcess(
        `⛔️ You can only create a Strapi app in an empty directory.`
      );
    }
  }

  // if database config is provided don't test the connection and create the project directly
  if (hasDatabaseConfig) {
    await trackUsage({ event: 'didChooseCustomDatabase', scope });

    const client = scope.database.settings.client;
    const configuration = {
      client,
      connection: merge(defaultConfigs[client] || {}, scope.database),
      dependencies: clientDependencies({ scope, client: client }),
    };
    return createProject(scope, configuration);
  }

  // if cli quickstart create project with default sqlite options
  if (scope.quick === true) {
    return createQuickStartProject(scope);
  }

  const useQuickStart = await askShouldUseQuickstart();

  // else if question response is quickstart create project
  if (useQuickStart) {
    return createQuickStartProject(scope);
  }

  await trackUsage({ event: 'didChooseCustomDatabase', scope });

  const configuration = await askDbInfosAndTest(scope).catch(error => {
    return trackUsage({ event: 'didNotConnectDatabase', scope, error }).then(
      () => {
        throw error;
      }
    );
  });

  await trackUsage({ event: 'didConnectDatabase', scope });
  return createProject(scope, configuration);
};

function stopProcess(message) {
  console.error(message);
  process.exit(1);
}

const MAX_RETRIES = 5;
async function askDbInfosAndTest(scope) {
  let retries = 0;

  async function loop() {
    // else ask for the client name
    const { client, connection } = await askDatabaseInfos(scope);

    const configuration = {
      client,
      connection,
      dependencies: clientDependencies({ scope, client: client }),
    };

    await testDatabaseConnection({
      scope,
      configuration,
    })
      .then(
        () => fse.remove(scope.tmpPath),
        err => {
          return fse.remove(scope.tmpPath).then(() => {
            throw err;
          });
        }
      )
      .catch(err => {
        console.log(`⛔️ Connection test failed: ${err.message}`);

        if (scope.debug) {
          console.log('Full error log:');
          console.log(err);
        }

        if (retries < MAX_RETRIES) {
          console.log('Retrying...');
          retries++;
          return loop();
        }

        throw new Error(
          `Could not connect to your database after ${MAX_RETRIES} tries`
        );
      });

    return configuration;
  }

  return loop();
}

async function testDatabaseConnection({ scope, configuration }) {
  const { client } = configuration;

  if (client === 'sqlite') return;

  await installDatabaseTestingDep({
    scope,
    configuration,
  });

  // const connectivityFile = join(
  //   scope.tmpPath,
  //   'node_modules',
  //   configuration.connection.connector,
  //   'lib',
  //   'utils',
  //   'connectivity.js'
  // );

  // const tester = require(connectivityFile);
  const tester = require(`${
    configuration.connection.connector
  }/lib/utils/connectivity.js`);
  return tester({ scope, connection: configuration.connection });
}

async function createProject(scope, { client, connection, dependencies }) {
  try {
    const { rootPath } = scope;
    const resources = join(__dirname, 'resources');

    // copy files
    await fse.copy(join(resources, 'files'), rootPath);

    // copy templates
    await fse.writeJSON(
      join(rootPath, 'package.json'),
      packageJSON({
        strapiDependencies: scope.strapiDependencies,
        additionalsDependencies: dependencies,
        strapiVersion: scope.strapiVersion,
        projectName: scope.name,
        uuid: scope.uuid,
      }),
      {
        spaces: 2,
      }
    );

    // ensure node_modules is created
    await fse.ensureDir(join(rootPath, 'node_modules'));

    await Promise.all(
      ['development', 'staging', 'production'].map(env => {
        return fse.writeJSON(
          join(rootPath, `config/environments/${env}/database.json`),
          databaseJSON({
            connection,
            env,
          }),
          { spaces: 2 }
        );
      })
    );
  } catch (err) {
    await fse.remove(scope.rootPath);
    throw err;
  }

  try {
    await runInstall(scope);
  } catch (error) {
    await trackUsage({
      event: 'didNotInstallProjectDependencies',
      scope,
      error,
    });
    throw error;
  }

  await trackUsage({ event: 'didCreateProject', scope });
}

async function createQuickStartProject(scope) {
  await trackUsage({ event: 'didChooseQuickstart', scope });

  // get default sqlite config
  const client = 'sqlite';
  const configuration = {
    client,
    connection: defaultConfigs[client],
    dependencies: clientDependencies({ scope, client: client }),
  };

  await createProject(scope, configuration);

  await execa('npm', ['run', 'develop'], {
    stdio: 'inherit',
    cwd: scope.rootPath,
    env: {
      FORCE_COLOR: 1,
    },
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

async function askShouldUseQuickstart() {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Choose your installation type',
      choices: [
        {
          name: 'Quickstart (recommended)',
          value: 'quick',
        },
        {
          name: 'Custom (manual settings)',
          value: 'custom',
        },
      ],
    },
  ]);

  return answer.type === 'quick';
}

const SETTINGS_FIELDS = [
  'database',
  'host',
  'srv',
  'port',
  'username',
  'password',
  'filename',
];

const OPTIONS_FIELDS = ['authenticationDatabase'];

async function askDatabaseInfos(scope) {
  const { client } = await inquirer.prompt([
    {
      type: 'list',
      name: 'client',
      message: 'Choose your default database client',
      choices: ['sqlite', 'postgres', 'mysql', 'mongo'],
      default: 'sqlite',
    },
  ]);

  const responses = await inquirer.prompt(
    dbQuestions[client].map(q => q({ scope, client }))
  );

  const connection = merge({}, defaultConfigs[client] || {}, {
    settings: pick(responses, SETTINGS_FIELDS),
    options: pick(responses, OPTIONS_FIELDS),
  });

  if (responses.ssl === true) {
    if (client === 'mongo') {
      connection.options.ssl = true;
    } else {
      connection.settings.ssl = true;
    }
  }

  return {
    client,
    connection,
  };
}

async function installDatabaseTestingDep({ scope, configuration }) {
  let packageCmd = scope.hasYarn
    ? `yarnpkg --cwd ${scope.tmpPath} add`
    : `npm install --prefix ${scope.tmpPath}`;

  // Manually create the temp directory for yarn
  if (scope.hasYarn) {
    await fse.ensureDir(scope.tmpPath);
  }

  const depArgs = Object.keys(configuration.dependencies).map(dep => {
    return `${dep}@${configuration.dependencies[dep]}`;
  });

  const cmd = `${packageCmd} ${depArgs.join(' ')}`;
  await execa.shell(cmd);
}

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
    console.log('Cancelling...');
    process.exit();
    // trackUsage({ event: 'didStopCreateProject', scope }).then(() => {
    // });
  });
}

const installArguments = ['install', '--production', '--no-optional'];
function runInstall({ rootPath, hasYarn }) {
  if (hasYarn) {
    return execa('yarnpkg', installArguments, { cwd: rootPath });
  }
  return execa('npm', installArguments, { cwd: rootPath });
}

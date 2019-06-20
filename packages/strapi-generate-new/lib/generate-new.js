'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const { join } = require('path');
const { merge, pick } = require('lodash');

const chalk = require('chalk');
const inquirer = require('inquirer');
const execa = require('execa');

// Local dependencies.
const packageJSON = require('./resources/json/package.json');
const databaseJSON = require('./resources/json/database.json.js');

const { trackError, trackUsage } = require('./utils/usage');
const stopProcess = require('./utils/stop-process');
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

module.exports = async scope => {
  await trackUsage({ event: 'willCreateProject', scope });

  const hasDatabaseConfig = Boolean(scope.database);

  // check rootPath is empty
  if (await fse.exists(scope.rootPath)) {
    const stat = await fse.stat(scope.rootPath);

    if (!stat.isDirectory()) {
      await trackError({ scope, error: 'Path is not a directory' });

      stopProcess(
        `⛔️ ${chalk.green(
          scope.rootPath
        )} is not a directory. Make sure to create a Strapi application in an empty directory.`
      );
    }

    const files = await fse.readdir(scope.rootPath);
    if (files.length > 1) {
      await trackError({ scope, error: 'Directory is not empty' });
      stopProcess(
        `⛔️ You can only create a Strapi app in an empty directory\nMake sure ${chalk.green(
          scope.rootPath
        )} is empty.`
      );
    }
  }

  // if database config is provided don't test the connection and create the project directly
  if (hasDatabaseConfig) {
    console.log('Creating a project from CLI arguments.');
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
    console.log('Creating a quickstart project.');
    return createQuickStartProject(scope);
  }

  const useQuickStart = await askShouldUseQuickstart();

  // else if question response is quickstart create project
  if (useQuickStart) {
    console.log('Creating a quickstart project.');
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

  console.log('Creating a project with custom database options');
  await trackUsage({ event: 'didConnectDatabase', scope });
  return createProject(scope, configuration);
};

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
        if (retries < MAX_RETRIES - 1) {
          console.log(`⛔️ Connection test failed: ${err.message}`);

          if (scope.debug) {
            console.log('Full error log:');
            console.log(err);
          }

          console.log('Retrying...');
          retries++;
          return loop();
        }

        console.log(err);
        stopProcess(
          `️⛔️ Could not connect to your database after ${MAX_RETRIES} tries. Try to check your database configuration an retry.`
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

async function createProject(
  scope,
  { connection, dependencies },
  { isQuickstart = false } = {}
) {
  console.log('Creating files');

  const { rootPath } = scope;
  const resources = join(__dirname, 'resources');

  try {
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

  console.log('Installing packages. This might take a few minutes.');
  console.log();

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

  console.log(`Your application was created at ${chalk.green(rootPath)}.\n`);

  const cmd = scope.hasYarn ? 'yarn' : 'npm run';

  if (!isQuickstart) {
    console.log('⚡ Change directory:');
    console.log(`${chalk.cyan('cd')} ${scope.rootPath}`);
    console.log();
    console.log('⚡️ Start your application:');
    console.log(`${chalk.cyan(cmd)} develop`);
  }
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

  await createProject(scope, configuration, { isQuickstart: true });

  console.log('⚡️ Starting your application...');

  await execa('npm', ['run', 'develop'], {
    stdio: 'inherit',
    cwd: scope.rootPath,
    env: {
      FORCE_COLOR: 1,
    },
  }).catch(() => {});
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

const installArguments = ['install', '--production', '--no-optional'];
function runInstall({ rootPath, hasYarn }) {
  if (hasYarn) {
    return execa('yarnpkg', installArguments, {
      cwd: rootPath,
      stdio: 'inherit',
    });
  }
  return execa('npm', installArguments, { cwd: rootPath, stdio: 'inherit' });
}

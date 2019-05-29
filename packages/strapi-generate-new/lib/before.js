'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Public node modules.
const _ = require('lodash');
const { cyan, green } = require('chalk');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const execa = require('execa');
const uuid = require('uuid/v4');
const rimraf = require('rimraf');

// Logger.
const trackSuccess = require('./success');

function hasYarn() {
  try {
    const { code } = execa.shellSync('yarnpkg --version');
    if (code === 0) return true;
    return false;
  } catch (err) {
    return false;
  }
}

/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */

/* eslint-disable no-useless-escape */
module.exports = (scope, cb) => {
  // App info.
  const hasDatabaseConfig = !!scope.database;

  _.defaults(scope, {
    name:
      scope.name === '.' || !scope.name
        ? scope.name
        : path.basename(process.cwd()),
    author: process.env.USER || 'A Strapi developer',
    email: process.env.EMAIL || '',
    year: new Date().getFullYear(),
    license: 'MIT',
    database: {},
    hasYarn: hasYarn(),
    additionalsDependencies: [
      'strapi-plugin-settings-manager',
      'strapi-plugin-content-type-builder',
      'strapi-plugin-content-manager',
      'strapi-plugin-users-permissions',
      'strapi-plugin-email',
      'strapi-plugin-upload',
    ],
  });

  // Make changes to the rootPath where the Strapi project will be created.
  scope.rootPath = path.resolve(process.cwd(), scope.name || '');
  scope.tmpPath = path.resolve(
    os.tmpdir(),
    `strapi${crypto.randomBytes(6).toString('hex')}`
  );
  scope.uuid = uuid();

  trackSuccess('willCreateProject', scope);

  // Ensure we aren't going to inadvertently delete any files.
  try {
    const files = fs.readdirSync(scope.rootPath);
    if (files.length > 1) {
      return console.log(
        `⛔️ ${cyan('strapi new')} can only be called in an empty directory.`
      );
    }
  } catch (err) {
    // ...
  }

  if (hasDatabaseConfig) {
    console.log(
      `Database determined by CLI args: ${scope.database.settings.client}`
    );
  }

  const connectionValidation = async () => {
    const databaseChoices = [
      {
        name: 'SQLite',
        value: {
          database: 'sqlite',
          connector: 'strapi-hook-bookshelf',
          module: 'sqlite3',
        },
      },
      {
        name: 'MongoDB',
        value: {
          database: 'mongo',
          connector: 'strapi-hook-mongoose',
        },
      },
      {
        name: 'MySQL',
        value: {
          database: 'mysql',
          connector: 'strapi-hook-bookshelf',
          module: 'mysql',
        },
      },
      {
        name: 'Postgres',
        value: {
          database: 'postgres',
          connector: 'strapi-hook-bookshelf',
          module: 'pg',
        },
      },
    ];

    const answers = await inquirer.prompt([
      {
        when: !scope.quick && !hasDatabaseConfig,
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
      {
        when: answers => {
          return !hasDatabaseConfig && answers.type === 'custom';
        },
        type: 'list',
        name: 'client',
        message: 'Choose your main database:',
        choices: databaseChoices,
        default: () => {
          if (scope.client) {
            return _.findIndex(databaseChoices, {
              value: _.omit(scope.client, ['version']),
            });
          }
        },
      },
    ]);

    scope.quick = answers.type === 'quick' || scope.quick;
    const isQuick = scope.quick;

    if (isQuick) {
      answers.client = databaseChoices[0].value;
    }

    if (hasDatabaseConfig) {
      const databaseChoice = _.find(databaseChoices, [
        'value.database',
        scope.database.settings.client,
      ]);
      scope.database.connector = databaseChoice.value.connector;
      answers.client = {
        ...databaseChoice.value,
      };
    } else {
      _.assign(scope.database, {
        connector: answers.client.connector,
        settings: {
          client: answers.client.database,
        },
        options: {},
      });
    }

    scope.client = answers.client;

    const connectedToTheDatabase = (withMessage = true) => {
      if (withMessage) {
        console.log();
        console.log(
          `The app has been connected to the database ${green('successfully')}!`
        );
      }

      if (isQuick) {
        trackSuccess('didChooseQuickstart', scope);
      } else {
        trackSuccess('didChooseCustomDatabase', scope);
      }

      trackSuccess('didConnectDatabase', scope);

      cb.success();
    };

    Promise.all([
      handleCustomDatabase({ scope, isQuick, hasDatabaseConfig }),
      installDatabaseTestingDep({ scope, isQuick }),
    ])
      .then(() => {
        // Bypass real connection test.
        if (isQuick) {
          return connectedToTheDatabase(false);
        }

        try {
          const connectivityFile = path.join(
            scope.tmpPath,
            'node_modules',
            scope.client.connector,
            'lib',
            'utils',
            'connectivity.js'
          );

          require(connectivityFile)(
            scope,
            connectedToTheDatabase,
            connectionValidation
          );
        } catch (err) {
          trackSuccess('didNotConnectDatabase', scope, err);
          console.log(err);
          rimraf.sync(scope.tmpPath);
          cb.error();
        }
      })
      .catch(err => {
        console.log(err);
        cb.error(err);
      });
  };

  connectionValidation();
};

async function handleCustomDatabase({ scope, hasDatabaseConfig, isQuick }) {
  const isMongo = scope.client.database === 'mongo';
  const isSQLite = scope.database.settings.client === 'sqlite';

  let answers = await inquirer.prompt([
    {
      when: !hasDatabaseConfig && !isSQLite,
      type: 'input',
      name: 'database',
      message: 'Database name:',
      default: _.get(scope.database, 'database', scope.name),
    },
    {
      when: !hasDatabaseConfig && !isSQLite,
      type: 'input',
      name: 'host',
      message: 'Host:',
      default: _.get(scope.database, 'host', '127.0.0.1'),
    },
    {
      when: !hasDatabaseConfig && isMongo,
      type: 'boolean',
      name: 'srv',
      message: '+srv connection:',
      default: _.get(scope.database, 'srv', false),
    },
    {
      when: !hasDatabaseConfig && !isSQLite,
      type: 'input',
      name: 'port',
      message: `Port${
        isMongo ? ' (It will be ignored if you enable +srv)' : ''
      }:`,
      default: () => {
        // eslint-disable-line no-unused-vars
        if (_.get(scope.database, 'port')) {
          return scope.database.port;
        }

        const ports = {
          mongo: 27017,
          postgres: 5432,
          mysql: 3306,
        };

        return ports[scope.client.database];
      },
    },
    {
      when: !hasDatabaseConfig && !isSQLite,
      type: 'input',
      name: 'username',
      message: 'Username:',
      default: _.get(scope.database, 'username', undefined),
    },
    {
      when: !hasDatabaseConfig && !isSQLite,
      type: 'password',
      name: 'password',
      message: 'Password:',
      mask: '*',
      default: _.get(scope.database, 'password', undefined),
    },
    {
      when: !hasDatabaseConfig && isMongo,
      type: 'input',
      name: 'authenticationDatabase',
      message: 'Authentication database (Maybe "admin" or blank):',
      default: _.get(scope.database, 'authenticationDatabase', undefined),
    },
    {
      when: !hasDatabaseConfig && !isSQLite,
      type: 'boolean',
      name: 'ssl',
      message: 'Enable SSL connection:',
      default: _.get(scope.database, 'ssl', false),
    },
    {
      when: !hasDatabaseConfig && isSQLite && !isQuick,
      type: 'input',
      name: 'filename',
      message: 'Filename:',
      default: () => '.tmp/data.db',
    },
  ]);

  if (isQuick) {
    answers.filename = '.tmp/data.db';
  }

  if (hasDatabaseConfig) {
    answers = _.merge(
      _.omit(scope.database.settings, ['client']),
      scope.database.options
    );
  }

  scope.database.settings.host = answers.host;
  scope.database.settings.port = answers.port;
  scope.database.settings.database = answers.database;
  scope.database.settings.username = answers.username;
  scope.database.settings.password = answers.password;

  if (answers.filename) {
    scope.database.settings.filename = answers.filename;
  }
  if (answers.srv) {
    scope.database.settings.srv = _.toString(answers.srv) === 'true';
  }
  if (answers.authenticationDatabase) {
    scope.database.options.authenticationDatabase =
      answers.authenticationDatabase;
  }

  // SQLite requirements.
  if (isSQLite) {
    // Necessary for SQLite configuration (https://knexjs.org/#Builder-insert).
    scope.database.options = {
      useNullAsDefault: true,
    };
  }

  if (answers.ssl && scope.client.database === 'mongo') {
    scope.database.options.ssl = _.toString(answers.ssl) === 'true';
  } else if (answers.ssl) {
    scope.database.settings.ssl = _.toString(answers.ssl) === 'true';
  }

  console.log();
  if (isQuick) {
    console.log('✅ Connected to the database');
  } else {
    console.log(
      '⏳ Testing database connection...\r\nIt might take a minute, please have a coffee ☕️'
    );
  }
}

async function installDatabaseTestingDep({ scope, isQuick }) {
  let packageCmd = scope.hasYarn
    ? `yarnpkg --cwd ${scope.tmpPath} add`
    : `npm install --prefix ${scope.tmpPath}`;

  // Manually create the temp directory for yarn
  if (scope.hasYarn) {
    await fs.ensureDir(scope.tmpPath);
  }

  let cmd = `${packageCmd} ${scope.client.connector}@${
    scope.strapiPackageJSON.version
  }`;

  if (scope.client.module) {
    cmd += ` ${scope.client.module}`;
  }

  if (scope.client.connector === 'strapi-hook-bookshelf') {
    cmd += ` strapi-hook-knex@${scope.strapiPackageJSON.version}`;
    scope.additionalsDependencies = scope.additionalsDependencies.concat([
      'strapi-hook-knex',
      'knex',
    ]);
  }

  if (isQuick) {
    scope.client.version = 'latest';
    return;
  }

  await execa.shell(cmd);

  if (scope.client.module) {
    const lock = require(path.join(
      `${scope.tmpPath}`,
      '/node_modules/',
      `${scope.client.module}/package.json`
    ));
    scope.client.version = lock.version;
  }
}

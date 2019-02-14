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
const {cyan, green} = require('chalk');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const shell = require('shelljs');
const uuid = require('uuid/v4');

// Logger.
const { packageManager } = require('strapi-utils');
const trackSuccess = require('./success');

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
    name: scope.name === '.' || !scope.name ? scope.name : path.basename(process.cwd()),
    author: process.env.USER || 'A Strapi developer',
    email: process.env.EMAIL || '',
    year: (new Date()).getFullYear(),
    license: 'MIT',
    database: {}
  });

  // Make changes to the rootPath where the Strapi project will be created.
  scope.rootPath = path.resolve(process.cwd(), scope.name || '');
  scope.tmpPath = path.resolve(os.tmpdir(), `strapi${ crypto.randomBytes(6).toString('hex') }`);
  scope.uuid = uuid();

  trackSuccess('willCreateProject', scope);

  // Ensure we aren't going to inadvertently delete any files.
  try {
    const files = fs.readdirSync(scope.rootPath);
    if (files.length > 1) {
      return console.log(`⛔️ ${cyan('strapi new')} can only be called in an empty directory.`);
    }
  } catch (err) {
    // ...
  }

  if (hasDatabaseConfig) {
    console.log(`Database determined by CLI args: ${scope.database.settings.client}`);
  }

  const connectionValidation = async () => {
    const databaseChoices = [
      {
        name: 'SQLite',
        value: {
          database: 'sqlite',
          connector: 'strapi-hook-bookshelf',
          module: 'sqlite3'
        }
      },
      {
        name: 'MongoDB',
        value: {
          database: 'mongo',
          connector: 'strapi-hook-mongoose'
        }
      },
      {
        name: 'MySQL',
        value: {
          database: 'mysql',
          connector: 'strapi-hook-bookshelf',
          module: 'mysql'
        }
      },
      {
        name: 'Postgres',
        value: {
          database: 'postgres',
          connector: 'strapi-hook-bookshelf',
          module: 'pg'
        }
      }
    ];

    const answers = await inquirer
      .prompt([
        {
          when: !scope.quick && !hasDatabaseConfig,
          type: 'list',
          name: 'type',
          message: 'Choose your installation type',
          choices: [{
            name: 'Quickstart (recommended)',
            value: 'quick'
          }, {
            name: 'Custom (manual settings)',
            value: 'custom'
          }]
        },
        {
          when: (answers) => {
            return !hasDatabaseConfig && answers.type === 'custom';
          },
          type: 'list',
          name: 'client',
          message: 'Choose your main database:',
          choices: databaseChoices,
          default: () => {
            if (scope.client) {
              return _.findIndex(databaseChoices, { value: _.omit(scope.client, ['version'])});
            }
          }
        }
      ]);

    scope.quick = answers.type === 'quick' || scope.quick;
    const isQuick = scope.quick;

    if (isQuick) {
      trackSuccess('didChooseQuickstart', scope);
      answers.client = databaseChoices[0].value;
    } else {
      trackSuccess('didChooseCustomDatabase', scope);
    }

    if (hasDatabaseConfig) {
      const databaseChoice = _.find(databaseChoices, ['value.database', scope.database.settings.client]);
      scope.database.connector = databaseChoice.value.connector;
      answers.client = {
        ...databaseChoice.value
      };
    } else {
      _.assign(scope.database, {
        connector: answers.client.connector,
        settings: {
          client: answers.client.database
        },
        options: {}
      });
    }

    scope.client = answers.client;

    const asyncFn = [
      new Promise(async resolve => {
        const isMongo = scope.client.database === 'mongo';
        const isSQLite = scope.database.settings.client === 'sqlite';

        let answers = await inquirer
          .prompt([
            {
              when: !hasDatabaseConfig && !isSQLite,
              type: 'input',
              name: 'database',
              message: 'Database name:',
              default: _.get(scope.database, 'database', scope.name)
            },
            {
              when: !hasDatabaseConfig && !isSQLite,
              type: 'input',
              name: 'host',
              message: 'Host:',
              default: _.get(scope.database, 'host', '127.0.0.1')
            },
            {
              when: !hasDatabaseConfig && isMongo,
              type: 'boolean',
              name: 'srv',
              message: '+srv connection:',
              default: _.get(scope.database, 'srv', false)
            },
            {
              when: !hasDatabaseConfig && !isSQLite,
              type: 'input',
              name: 'port',
              message: `Port${isMongo ? ' (It will be ignored if you enable +srv)' : ''}:`,
              default: (answers) => { // eslint-disable-line no-unused-vars
                if (_.get(scope.database, 'port')) {
                  return scope.database.port;
                }

                const ports = {
                  mongo: 27017,
                  postgres: 5432,
                  mysql: 3306
                };

                return ports[scope.client.database];
              }
            },
            {
              when: !hasDatabaseConfig && !isSQLite,
              type: 'input',
              name: 'username',
              message: 'Username:',
              default: _.get(scope.database, 'username', undefined)
            },
            {
              when: !hasDatabaseConfig && !isSQLite,
              type: 'password',
              name: 'password',
              message: 'Password:',
              mask: '*',
              default: _.get(scope.database, 'password', undefined)
            },
            {
              when: !hasDatabaseConfig && isMongo,
              type: 'input',
              name: 'authenticationDatabase',
              message: 'Authentication database (Maybe "admin" or blank):',
              default: _.get(scope.database, 'authenticationDatabase', undefined)
            },
            {
              when: !hasDatabaseConfig && !isSQLite,
              type: 'boolean',
              name: 'ssl',
              message: 'Enable SSL connection:',
              default: _.get(scope.database, 'ssl', false)
            },
            {
              when: !hasDatabaseConfig && isSQLite && !isQuick,
              type: 'input',
              name: 'filename',
              message: 'Filename:',
              default: () => '.tmp/data.db'
            }
          ]);

        if (isQuick) {
          answers.filename = '.tmp/data.db';
        }

        if (hasDatabaseConfig) {
          answers = _.merge((_.omit(scope.database.settings, ['client'])), scope.database.options);
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
          scope.database.settings.srv =  _.toString(answers.srv) === 'true';
        }
        if (answers.authenticationDatabase) {
          scope.database.options.authenticationDatabase = answers.authenticationDatabase;
        }
        
        // SQLite requirements.
        if (isSQLite) {
          // Necessary for SQLite configuration (https://knexjs.org/#Builder-insert).
          scope.database.options = {
            useNullAsDefault: true
          };
        }

        if (answers.ssl && scope.client.database === 'mongo') {
          scope.database.options.ssl = _.toString(answers.ssl) === 'true';
        } else if (answers.ssl) {
          scope.database.settings.ssl = _.toString(answers.ssl) === 'true';
        }

        console.log();
        console.log(isQuick ? '✅ Connected to the database' : '⏳ Testing database connection...');

        resolve();
      }),
      new Promise(resolve => {
        const isStrapiInstalledWithNPM = packageManager.isStrapiInstalledWithNPM();
        let packageCmd = packageManager.commands('install --prefix', scope.tmpPath);
        // Manually create the temp directory for yarn
        if (!isStrapiInstalledWithNPM) {
          shell.exec(`mkdir ${scope.tmpPath}`);
        }

        let cmd = `${packageCmd} ${scope.client.connector}@${scope.strapiPackageJSON.version}`;
        let linkNodeModulesCommand = `cd ${scope.tmpPath} && npm link ${scope.client.connector}`;

        if (scope.client.module) {
          cmd += ` ${scope.client.module}`;
        }

        if (scope.client.connector === 'strapi-hook-bookshelf') {
          cmd += ` strapi-hook-knex@${scope.strapiPackageJSON.version}`;
          linkNodeModulesCommand += ` && npm link strapi-hook-knex`;

          scope.additionalsDependencies = ['strapi-hook-knex', 'knex'];
        }

        if (isQuick) {
          scope.client.version = 'latest';

          return resolve();
        }

        shell.exec(cmd, { silent: true }, () => {
          if (scope.client.module) {
            const lock = require(path.join(`${scope.tmpPath}`, '/node_modules/', `${scope.client.module}/package.json`));
            scope.client.version = lock.version;

            if (scope.developerMode === true && scope.client.connector === 'strapi-hook-bookshelf') {
              let knexVersion;

              try {
                knexVersion = require(path.join(`${scope.tmpPath}`,'/node_modules/', 'knex', 'package.json'));
              } catch (e) {
                knexVersion = require(path.join(`${scope.tmpPath}`,'/node_modules/','strapi-hook-knex', 'node_modules', 'knex', 'package.json'));
              }

              scope.additionalsDependencies[1] = `knex@${knexVersion.version || 'latest'}`;
            }
          }

          if (scope.developerMode) {
            shell.exec(linkNodeModulesCommand, { silent: true }, () => {
              resolve();
            });
          } else {
            resolve();
          }
        });
      })
    ];

    const connectedToTheDatabase = (withMessage = true) => {
      console.log();

      if (withMessage) {  
        console.log(`The app has been connected to the database ${green('successfully')}!`);
        console.log();
      }
    
      trackSuccess('didConnectDatabase', scope);

      cb.success();
    };

    Promise.all(asyncFn)
      .then(() => {
        // Bypass real connection test.
        if (isQuick) {
          return connectedToTheDatabase(false);
        }

        try {
          const connectivityFile = path.join(scope.tmpPath, 'node_modules', scope.client.connector, 'lib', 'utils', 'connectivity.js');

          require(connectivityFile)(scope, connectedToTheDatabase, connectionValidation);
        } catch(err) {
          trackSuccess('didNotConnectDatabase', scope, err);
          console.log(err);
          shell.rm('-r', scope.tmpPath);
          cb.error();
        }
      });
  };

  connectionValidation();
};

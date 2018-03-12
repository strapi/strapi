'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;

// Public node modules.
const _ = require('lodash');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const shell = require('shelljs');

// Logger.
const logger = require('strapi-utils').logger;

/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */

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
  scope.tmpPath = path.resolve(process.cwd(), 'tmp');

  // Ensure we aren't going to inadvertently delete any files.
  try {
    const files = fs.readdirSync(scope.rootPath);
    if (files.length > 1) {
      return logger.error('`$ strapi new` can only be called in an empty directory.');
    }
  } catch (err) {
    // ...
  }

  logger.info('Let\s configurate the connection to your database:');

  if (hasDatabaseConfig) {
    logger.info(`Database determined by CLI args: ${scope.database.settings.client}`);
  }

  const connectionValidation = () => {
    const databaseChoices = [
      {
        name: 'MongoDB (highly recommended)',
        value: {
          database: 'mongo',
          connector: 'strapi-mongoose'
        }
      },
      {
        name: 'Postgres',
        value: {
          database: 'postgres',
          connector: 'strapi-bookshelf',
          module: 'pg'
        }
      },
      {
        name: 'MySQL',
        value: {
          database: 'mysql',
          connector: 'strapi-bookshelf',
          module: 'mysql'
        }
      },
      {
        name: 'Sqlite3',
        value: {
          database: 'sqlite3',
          connector: 'strapi-bookshelf',
          module: 'sqlite3'
        }
      },
      {
        name: 'Redis',
        value: {
          database: 'redis',
          connector: 'strapi-redis'
        }
      }
    ];

    inquirer
    .prompt([
      {
        when: !hasDatabaseConfig,
        type: 'list',
        prefix: '',
        name: 'client',
        message: 'Choose your main database:',
        choices: databaseChoices,
        default: () => {
          if (scope.client) {
            return _.findIndex(databaseChoices, { value: _.omit(scope.client, ['version'])});
          }
        }
      }
    ])
    .then(answers => {
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
        new Promise(resolve => {
          inquirer
          .prompt([
            {
              when: !hasDatabaseConfig,
              type: 'input',
              prefix: '',
              name: 'database',
              message: 'Database name:',
              default: _.get(scope.database, 'database', 'strapi')
            },
            {
              when: !hasDatabaseConfig,
              type: 'input',
              prefix: '',
              name: 'host',
              message: 'Host:',
              default: _.get(scope.database, 'host', '127.0.0.1')
            },
            {
              when: !hasDatabaseConfig,
              type: 'input',
              prefix: '',
              name: 'port',
              message: 'Port:',
              default: (answers) => {
                if (_.get(scope.database, 'port')) {
                  return scope.database.port;
                }

                const ports = {
                  mongo: 27017,
                  postgres: 5432,
                  mysql: 3306,
                  sqlite3: 1433,
                  redis: 6379
                };

                return ports[scope.client.database];
              }
            },
            {
              when: !hasDatabaseConfig,
              type: 'input',
              prefix: '',
              name: 'username',
              message: 'Username:',
              default: _.get(scope.database, 'username', undefined)
            },
            {
              when: !hasDatabaseConfig,
              type: 'password',
              prefix: '',
              name: 'password',
              message: 'Password:',
              mask: '*',
              default: _.get(scope.database, 'password', undefined)
            },
            {
              when: !hasDatabaseConfig,
              type: 'boolean',
              prefix: '',
              name: 'ssl',
              message: 'Enable SSL connection:',
              default: _.get(scope.database, 'ssl', false)
            }
          ])
          .then(answers => {

            if (hasDatabaseConfig) {
              answers = _.omit(scope.database.settings, ['client'])
            }

            scope.database.settings.host = answers.host;
            scope.database.settings.port = answers.port;
            scope.database.settings.database = answers.database;
            scope.database.settings.username = answers.username;
            scope.database.settings.password = answers.password;
            scope.database.settings.ssl = answers.ssl;

            logger.info('Testing database connection...');

            resolve();
          });
        }),
        new Promise(resolve => {
          let cmd = `npm install --prefix "${scope.tmpPath}" ${scope.client.connector}@alpha`;
          if (scope.client.module) {
            cmd += ` ${scope.client.module}`;
          }

          exec(cmd, () => {
            if (scope.client.module) {
              const lock = require(path.join(`${scope.tmpPath}`,`/node_modules/`,`${scope.client.module}/package.json`));
              scope.client.version = lock.version;
            }

            resolve();
          });
        })
      ];

      Promise.all(asyncFn)
      .then(() => {
        try {
          require(path.join(`${scope.tmpPath}`,`/node_modules/`,`${scope.client.connector}/lib/utils/connectivity.js`))(scope, cb.success, connectionValidation);
        } catch(err) {
          shell.rm('-r', scope.tmpPath);
          logger.info('Copying the dashboard...');
          cb.success();
        }
      });
    });
  };

  connectionValidation();
};

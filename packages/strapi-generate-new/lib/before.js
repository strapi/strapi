'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const exec = require('child_process').exec;


// Public node modules.
const _ = require('lodash');
const {cyan} = require('chalk');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const shell = require('shelljs');

// Logger.
const { packageManager } = require('strapi-utils');

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

  // Ensure we aren't going to inadvertently delete any files.
  try {
    const files = fs.readdirSync(scope.rootPath);
    if (files.length > 1) {
      return console.log(`⛔️ ${cyan('strapi new')} can only be called in an empty directory.`);
    }
  } catch (err) {
    // ...
  }

  console.log('Let\s configurate the connection to your database:');

  if (hasDatabaseConfig) {
    console.log(`Database determined by CLI args: ${scope.database.settings.client}`);
  }

  const connectionValidation = () => {
    const databaseChoices = [
      {
        name: 'MongoDB',
        value: {
          database: 'mongo',
          connector: 'strapi-hook-mongoose'
        }
      },
      {
        name: 'Postgres',
        value: {
          database: 'postgres',
          connector: 'strapi-hook-bookshelf',
          module: 'pg'
        }
      },
      {
        name: 'MySQL',
        value: {
          database: 'mysql',
          connector: 'strapi-hook-bookshelf',
          module: 'mysql'
        }
      }
    ];

    inquirer
      .prompt([
        {
          when: !hasDatabaseConfig,
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
                  name: 'database',
                  message: 'Database name:',
                  default: _.get(scope.database, 'database', scope.name)
                },
                {
                  when: !hasDatabaseConfig,
                  type: 'input',
                  name: 'host',
                  message: 'Host:',
                  default: _.get(scope.database, 'host', '127.0.0.1')
                },
                {
                  when: !hasDatabaseConfig && scope.client.database === 'mongo',
                  type: 'boolean',
                  name: 'srv',
                  message: '+srv connection:',
                  default: _.get(scope.database, 'srv', false)
                },
                {
                  when: !hasDatabaseConfig,
                  type: 'input',
                  name: 'port',
                  message: `Port${scope.client.database === 'mongo' ? ' (It will be ignored if you enable +srv)' : ''}:`,
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
                  when: !hasDatabaseConfig,
                  type: 'input',
                  name: 'username',
                  message: 'Username:',
                  default: _.get(scope.database, 'username', undefined)
                },
                {
                  when: !hasDatabaseConfig,
                  type: 'password',
                  name: 'password',
                  message: 'Password:',
                  mask: '*',
                  default: _.get(scope.database, 'password', undefined)
                },
                {
                  when: !hasDatabaseConfig && scope.client.database === 'mongo',
                  type: 'input',
                  name: 'authenticationDatabase',
                  message: 'Authentication database (Maybe "admin" or blank):',
                  default: _.get(scope.database, 'authenticationDatabase', undefined)
                },
                {
                  when: !hasDatabaseConfig && scope.client.database === 'mongo',
                  type: 'boolean',
                  name: 'ssl',
                  message: 'Enable SSL connection:',
                  default: _.get(scope.database, 'ssl', false)
                }
              ])
              .then(answers => {
                if (hasDatabaseConfig) {
                  answers = _.merge((_.omit(scope.database.settings, ['client'])), scope.database.options);
                }

                scope.database.settings.host = answers.host;
                scope.database.settings.srv = _.toString(answers.srv) === 'true';
                scope.database.settings.port = answers.port;
                scope.database.settings.database = answers.database;
                scope.database.settings.username = answers.username;
                scope.database.settings.password = answers.password;
                scope.database.options.authenticationDatabase = answers.authenticationDatabase;
                scope.database.options.ssl = _.toString(answers.ssl) === 'true';

                console.log();
                console.log('⏳ Testing database connection...');

                resolve();
              });
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

            exec(cmd, () => {
              if (scope.client.module) {
                const lock = require(path.join(`${scope.tmpPath}`, '/node_modules/', `${scope.client.module}/package.json`));
                scope.client.version = lock.version;

                if (scope.developerMode === true && scope.client.connector === 'strapi-hook-bookshelf') {
                  const knexVersion = require(path.join(`${scope.tmpPath}`,`/node_modules/`,`knex/package.json`));
                  scope.additionalsDependencies[1] = `knex@${knexVersion.version || 'latest'}`;
                }
              }

              if (scope.developerMode) {
                exec(linkNodeModulesCommand, () => {
                  resolve();
                });
              } else {
                resolve();
              }
            });
          })
        ];

        Promise.all(asyncFn)
          .then(() => {
            try {
              require(path.join(`${scope.tmpPath}`, '/node_modules/', `${scope.client.connector}/lib/utils/connectivity.js`))(scope, cb.success, connectionValidation);
            } catch(err) {
              shell.rm('-r', scope.tmpPath);
              console.log(err);
              cb.error();
            }
          });
      });
  };

  connectionValidation();
};

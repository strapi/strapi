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
  _.defaults(scope, {
    name: scope.name === '.' || !scope.name ? scope.name : path.basename(process.cwd()),
    author: process.env.USER || 'A Strapi developer',
    email: process.env.EMAIL || '',
    year: (new Date()).getFullYear(),
    license: 'MIT'
  });

  // Make changes to the rootPath where the Strapi project will be created.
  scope.rootPath = path.resolve(process.cwd(), scope.name || '');

  // Ensure we aren't going to inadvertently delete any files.
  try {
    const files = fs.readdirSync(scope.rootPath);
    if (files.length) {
      return logger.error('`$ strapi new` can only be called in an empty directory.');
    }
  } catch (err) {
    // ...
  }

  logger.info('Let\s configurate the connection to your database:');
  let formSteps = new Promise(resolve => {
    inquirer
    .prompt([
      {
        type: 'list',
        prefix: '',
        name: 'client',
        message: 'Choose your database:',
        choices: [
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
        ]
      }
    ])
    .then(answers => {
      scope.client = answers.client;
      scope.database = {
        connector: answers.client.connector,
        settings: {
          client: answers.client.database
        },
        options: {}
      };

      resolve();
    });
  });

  formSteps = formSteps.then(() => {
    const asyncFn = [
      new Promise(resolve => {
        inquirer
        .prompt([
          {
            type: 'input',
            prefix: '',
            name: 'name',
            message: 'Database name:',
            default: 'strapi'
          },
          {
            type: 'input',
            prefix: '',
            name: 'host',
            message: 'Host:',
            default: 'localhost'
          },
          {
            type: 'input',
            prefix: '',
            name: 'port',
            message: 'Port:',
            default: (answers) => {
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
            type: 'input',
            prefix: '',
            name: 'username',
            message: 'Username:'
          },
          {
            type: 'input',
            prefix: '',
            name: 'password',
            message: 'Password:'
          }
        ])
        .then(answers => {
          scope.database.host = answers.host;
          scope.database.port = answers.port;
          scope.database.database = answers.name;
          scope.database.username = answers.username;
          scope.database.password = answers.password;

          resolve();
        });
      }),
      new Promise(resolve => {
        let cmd = `npm install --prefix ${scope.rootPath}_ ${scope.client.connector}@alpha`;
        if (scope.client.module) {
          cmd += ` ${scope.client.module}`;
        }

        exec(cmd, () => {
          if (scope.client.module) {
            const lock = require(`${scope.rootPath}_/package-lock.json`);
            scope.client.version = lock.dependencies[scope.client.module].version;
          }

          resolve();
        });
      }),
    ];

    Promise.all(asyncFn)
    .then(() => {
      execSync(`rm -r ${scope.rootPath}_`);

      logger.info('Copying the dashboard...');

      // Trigger callback with no error to proceed.
      cb.success();
    });
  });
};

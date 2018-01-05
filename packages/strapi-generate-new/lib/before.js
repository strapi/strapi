'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

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
            connector: 'strapi-bookshelf'
          }
        },
        {
          name: 'MySQL',
          value: {
            database: 'mysql',
            connector: 'strapi-bookshelf'
          }
        },
        {
          name: 'Sqlite3',
          value: {
            database: 'sqlite3',
            connector: 'strapi-bookshelf'
          }
        },
        {
          name: 'Redis',
          value: {
            database: 'redis',
            connector: 'strapi-bookshelf'
          }
        }
      ]
    },
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

        return ports[answers.client.database];
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
    scope.database = {
      connector: answers.client.connector,
      settings: {
        client: answers.client.database,
        host: answers.host,
        port: answers.port,
        database: answers.name,
        username: answers.username,
        password: answers.password
      },
      options: {}
    };

    logger.info('Copying the dashboard...');

    // Trigger callback with no error to proceed.
    return cb.success();
  });
};

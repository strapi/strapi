'use strict';

// Node.js core.
const path = require('path');

// Public node modules
const inquirer = require('inquirer');
const rimraf = require('rimraf');

module.exports = (scope, success, error) => {
  if (scope.client.database === 'sqlite') {
    return success();
  }

  let knex;

  try {
    // eslint-disable-next-line import/no-unresolved
    knex = require('knex');
  } catch (err) {
    // eslint-disable-next-line import/no-unresolved
    knex = require(path.resolve(scope.tmpPath, 'node_modules', 'knex'));
  }

  // eslint-disable-next-line import/no-unresolved
  const client = knex({
    client: scope.client.module,
    connection: Object.assign({}, scope.database.settings, {
      user: scope.database.settings.username
    }),
    useNullAsDefault: true
  });

  client.raw('select 1+1 as result').then(() => {
    const selectQueries = {
      postgres: 'SELECT tablename FROM pg_tables WHERE schemaname=\'public\'',
      mysql: 'SELECT * FROM information_schema.tables',
      sqlite: 'select * from sqlite_master'
    };

    client.raw(selectQueries[scope.client.database]).then((tables) => {
      client.destroy();

      const next = () => {
        rimraf(scope.tmpPath, (err) => {
          if (err) {
            console.log(`Error removing connection test folder: ${scope.tmpPath}`);
          }

          success();
        });
      };

      if (tables.rows && tables.rows.length !== 0) {
        if (scope.dbforce) {
          next();
        } else {
          console.log('🤔 It seems that your database is not empty. Be aware that Strapi is going to automatically creates tables & columns, and might update columns which can corrupt data or cause data loss.');

          inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to continue with the ${scope.database.settings.database} database:`,
          }])
            .then(({ confirm }) => {
              if (confirm) {
                next();
              } else {
                error();
              }
            });
        }
      } else {
        next();
      }
    });
  })
    .catch((err) => {
      if (scope.debug) {
        console.log('🐛 Full error log:');
        console.log(err);
        return error();
      }

      if (err.sql) {
        console.log('⚠️  Server connection has failed! Make sure your database server is running.');
      } else {
        console.log(`⚠️  Database connection has failed! Make sure your "${scope.database.settings.database}" database exist.`);
      }
      console.log(err.message);

      error();
    });
};

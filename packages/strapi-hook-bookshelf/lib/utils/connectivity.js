'use strict';

// Public node modules
const inquirer = require('inquirer');
const rimraf = require('rimraf');

module.exports = (scope, success, error) => {
  // eslint-disable-next-line import/no-unresolved
  const knex = require('knex')({
    client: scope.client.module,
    connection: Object.assign({}, scope.database.settings, {
      user: scope.database.settings.username
    })
  });

  knex.raw('select 1+1 as result').then(() => {
    knex.raw(scope.client.database === 'postgres' ? "SELECT tablename FROM pg_tables WHERE schemaname='public'" : 'SELECT * FROM information_schema.tables').then((tables) => {
      knex.destroy();

      const next = () => {
        rimraf(scope.tmpPath, (err) => {
          if (err) {
            console.log(`Error removing connection test folder: ${scope.tmpPath}`);
          }
          success();
        });
      };

      if (tables.rows && tables.rows.length !== 0) {
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
      } else {
        next();
      }
    });
  })
    .catch((err) => {
      if (err.sql) {
        console.log('⚠️ Server connection has failed! Make sure your database server is running.');
      } else {
        console.log(`⚠️ Database connection has failed! Make sure your "${scope.database.settings.database}" database exist.`);
      }
      error();
    });
};

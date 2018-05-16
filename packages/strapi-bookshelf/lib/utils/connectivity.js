'use strict';

// Node.js core.
const execSync = require('child_process').execSync;
const path = require('path');

// Public node modules
const inquirer = require('inquirer');

// Logger.
const logger = require('strapi-utils').logger;

module.exports = (scope, success, error) => {
  const knex  = require(path.resolve(`${scope.tmpPath}/node_modules/knex`))({
    client: scope.client.module,
    connection: Object.assign({}, scope.database.settings, {
      user: scope.database.settings.username
    })
  });

  knex.raw('select 1+1 as result').then(() => {
    logger.info('The app has been connected to the database successfully');

    knex.raw(scope.client.database === 'postgres' ? "SELECT tablename FROM pg_tables WHERE schemaname='public'" : 'SELECT * FROM information_schema.tables').then((tables) => {
      knex.destroy();

      const next = () => {
        execSync(`rm -r "${scope.tmpPath}"`);

        logger.info('Copying the dashboard...');

        success();
      };

      if (tables.rows && tables.rows.length !== 0) {
        logger.warn('It seems that your database is not empty. Be aware that Strapi is going to automatically creates tables & columns, and might update columns which can corrupt data or cause data loss.');

        inquirer.prompt([{
          type: 'confirm',
          prefix: '',
          name: 'confirm',
          message: `Are you sure you want to continue with the ${scope.database.settings.database} database:`,
        }])
          .then(({confirm}) => {
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
        logger.warn('Server connection has failed! Make sure your database server is running.');
      } else {
        logger.warn(`Database connection has failed! Make sure your "${scope.database.settings.database}" database exist.`);
      }
      error();
    });
};

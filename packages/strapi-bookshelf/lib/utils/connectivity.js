'use strict';

// Node.js core.
const execSync = require('child_process').execSync;
const path = require('path');

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
    knex.destroy();
    execSync(`rm -r "${scope.tmpPath}"`);

    logger.info('Copying the dashboard...');

    success();
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

'use strict';

// Node.js core.
const execSync = require('child_process').execSync;

// Logger.
const logger = require('strapi-utils').logger;

module.exports = (scope, success, error) => {
  const knex  = require(`${scope.rootPath}_/node_modules/knex`)({
    client: scope.client.module,
    connection: scope.database
  });

  knex.raw('select 1+1 as result').then(() => {
    logger.info('Database connection is a success!');
    knex.destroy();
    execSync(`rm -r ${scope.rootPath}_`);

    logger.info('Copying the dashboard...');

    success();
  })
  .catch(() => {
    logger.warn('Database connection failed!');
    error();
  });
};

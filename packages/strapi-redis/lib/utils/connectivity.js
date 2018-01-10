'use strict';

// Node.js core.
const execSync = require('child_process').execSync;

// Logger.
const logger = require('strapi-utils').logger;

module.exports = (scope, success, error) => {
  const Redis = require(`${scope.rootPath}_/node_modules/ioredis`);
  const redis = new Redis({
    port: scope.database.port,
    host: scope.database.host,
    password: scope.database.password,
    db: scope.database.database
  });

  redis.connect((err) => {
    redis.disconnect();

    if (err) {
      logger.warn('Database connection failed!');
      return error();
    }

    logger.info('Database connection is a success!');

    execSync(`rm -r ${scope.rootPath}_`);

    logger.info('Copying the dashboard...');

    success();
  });
};

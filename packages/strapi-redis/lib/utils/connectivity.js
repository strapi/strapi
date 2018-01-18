'use strict';

// Node.js core.
const execSync = require('child_process').execSync;
const path = require('path');

// Logger.
const logger = require('strapi-utils').logger;

module.exports = (scope, success, error) => {
  const Redis = require(`${scope.rootPath}/node_modules/ioredis`);
  const redis = new Redis({
    port: scope.database.settings.port,
    host: scope.database.settings.host,
    password: scope.database.settings.password,
    db: scope.database.settings.database
  });

  redis.connect((err) => {
    redis.disconnect();

    if (err) {
      logger.warn('Database connection has failed! Make sure your database is running.');
      return error();
    }

    logger.info('The app has been connected to the database successfully!');

    execSync(`rm -r ${scope.rootPath}`);

    logger.info('Copying the dashboard...');

    success();
  });
};

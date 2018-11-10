'use strict';

// Public node modules
const rimraf = require('rimraf');

// Logger.
const logger = require('strapi-utils').logger;

module.exports = (scope, success, error) => {
  const Redis = require(`ioredis`);
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

    rimraf(scope.tmpPath, (err) => {
      if (err) {
        console.log(`Error removing connection test folder: ${scope.tmpPath}`);
      }
      logger.info('Copying the dashboard...');

      success();
    });

  });
};

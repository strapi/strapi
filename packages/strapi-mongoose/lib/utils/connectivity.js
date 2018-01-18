'use strict';

// Node.js core.
const execSync = require('child_process').execSync;
const path = require('path');

// Logger.
const logger = require('strapi-utils').logger;

module.exports = (scope, success, error) => {
  const Mongoose = require(path.resolve(`${scope.rootPath}/node_modules/mongoose`));

  const connectOptions = {}
  if (scope.database.settings.username && scope.database.settings.password) {
    connectOptions.user = scope.database.settings.username
    connectOptions.pass = scope.database.settings.password
  }
  Mongoose.connect(`mongodb://${scope.database.settings.host}:${scope.database.settings.port}/${scope.database.settings.database}`, connectOptions, function (err) {
    if (err) {
      logger.warn('Database connection has failed! Make sure your database is running.');
      return error();
    }

    logger.info('The app has been connected to the database successfully!');

    Mongoose.connection.close();

    execSync(`rm -r ${scope.rootPath}`);

    logger.info('Copying the dashboard...');

    success();
  });
};

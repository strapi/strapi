'use strict';

// Node.js core.
const execSync = require('child_process').execSync;
const path = require('path');

// Logger.
const logger = require('strapi-utils').logger;

module.exports = (scope, success, error) => {
  const Mongoose = require(path.resolve(`${scope.tmpPath}/node_modules/mongoose`));

  const { username, password } = scope.database.settings;
  const { authenticationDatabase, ssl } = scope.database.options;

  const connectOptions = {};

  if (username) {
    connectOptions.user = username;

    if (password) {
      connectOptions.pass = password;
    }
  }

  if (authenticationDatabase) {
    connectOptions.authSource = authenticationDatabase;
  }

  connectOptions.ssl = ssl ? true : false;

  Mongoose.connect(`mongodb://${scope.database.settings.host}:${scope.database.settings.port}/${scope.database.settings.database}`, connectOptions, function (err) {
    if (err) {
      logger.warn('Database connection has failed! Make sure your database is running.');
      return error();
    }

    logger.info('The app has been connected to the database successfully!');

    Mongoose.connection.close();

    execSync(`rm -r "${scope.tmpPath}"`);

    logger.info('Copying the dashboard...');

    success();
  });
};

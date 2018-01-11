'use strict';

// Node.js core.
const execSync = require('child_process').execSync;
const path = require('path');

// Logger.
const logger = require('strapi-utils').logger;

module.exports = (scope, success, error) => {
  const Mongoose = require(path.resolve(`${scope.rootPath}/node_modules/mongoose`));

  Mongoose.connect(`mongodb://${ (scope.database.username && scope.database.password) ? `${scope.database.username}:${scope.database.password}@` : '' }${scope.database.host}:${scope.database.port}/${scope.database.database}`, function (err) {
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

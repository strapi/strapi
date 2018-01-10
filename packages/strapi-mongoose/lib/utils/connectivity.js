'use strict';

// Node.js core.
const execSync = require('child_process').execSync;

// Logger.
const logger = require('strapi-utils').logger;

module.exports = (scope, success, error) => {
  const Mongoose = require(`${scope.rootPath}_/node_modules/mongoose`);

  Mongoose.connect(`mongodb://${ (scope.database.username && scope.database.password) ? `${scope.database.username}:${scope.database.password}@` : '' }${scope.database.host}:${scope.database.port}/${scope.database.database}`, function (err) {
    if (err) {
      logger.warn('Database connection failed!');
      return error();
    }

    logger.info('Database connection is a success!');

    Mongoose.connection.close();

    execSync(`rm -r ${scope.rootPath}_`);

    logger.info('Copying the dashboard...');

    success();
  });
};

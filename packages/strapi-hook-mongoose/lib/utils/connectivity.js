'use strict';

// Public node modules
const rimraf = require('rimraf');

module.exports = (scope, success, error) => {
  const Mongoose = require('mongoose');

  const { username, password, srv } = scope.database.settings;
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
  connectOptions.useNewUrlParser = true;
  connectOptions.dbName = scope.database.settings.database;

  Mongoose.connect(`mongodb${srv ? '+srv' : ''}://${scope.database.settings.host}${!srv ? `:${scope.database.settings.port}` : ''}/`, connectOptions, function (err) {
    if (err) {
      console.log('⚠️  Database connection has failed! Make sure your database is running.');

      if (scope.debug) {
        console.log('🐛 Full error log:');
        console.log(err);
      }

      return error();
    }

    Mongoose.connection.close();

    rimraf(scope.tmpPath, (err) => {
      if (err) {
        console.log(`Error removing connection test folder: ${scope.tmpPath}`);
      }
      success();
    });
  });
};

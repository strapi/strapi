'use strict';

// Node.js core.
const execSync = require('child_process').execSync;
const path = require('path');

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
  connectOptions.useNewUrlParser = true;

  Mongoose.connect(`mongodb://${scope.database.settings.host}:${scope.database.settings.port}/${scope.database.settings.database}`, connectOptions, function (err) {
    if (err) {
      console.log('⚠️ Database connection has failed! Make sure your database is running.');
      return error();
    }

    Mongoose.connection.close();

    execSync(`rm -r "${scope.tmpPath}"`);

    success();
  });
};

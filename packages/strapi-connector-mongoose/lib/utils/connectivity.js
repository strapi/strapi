'use strict';

const _ = require('lodash');

module.exports = async ({ connection }) => {
  const Mongoose = require('mongoose');

  const { srv } = connection.settings;

  const connectOptions = {
    user: _.get(connection.settings, 'username'),
    pass: _.get(connection.settings, 'pass'),
    authSource: _.get(connection.options, 'authenticationDatabase'),
    dbName: _.get(connection.settings, 'database'),
    ssl: _.get(connection.settings, 'ssl', false),
    useNewUrlParser: true,
    ...connection.options,
  };

  if (connection.options.debug === true) {
    Mongoose.set('debug', true);
  }

  return Mongoose.connect(
    `mongodb${srv ? '+srv' : ''}://${connection.settings.host}${
      !srv ? `:${connection.settings.port}` : ''
    }/`,
    connectOptions
  ).then(
    () => {
      Mongoose.connection.close();
    },
    (error) => {
      Mongoose.connection.close();
      throw error;
    }
  );
};

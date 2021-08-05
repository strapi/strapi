'use strict';

module.exports = {
  // TODO: update load middleware to not load the admin middleware from here
  config: require('./config'),
  services: require('./services'),
  controllers: require('./controllers'),
};

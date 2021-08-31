'use strict';

module.exports = {
  // TODO: update load middleware to not load the admin middleware from here
  bootstrap: require('./bootstrap'),
  routes: require('./routes'),
  services: require('./services'),
  controllers: require('./controllers'),
};

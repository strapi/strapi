'use strict';

module.exports = {
  register: require('./register'),
  contentTypes: require('./content-types'),
  bootstrap: require('./bootstrap'),
  destroy: require('./destroy'),
  routes: require('./routes'),
  services: require('./services'),
  controllers: require('./controllers'),
};

'use strict';

const bootstrap = require('./bootstrap');
const register = require('./register');
const destroy = require('./destroy');

module.exports = {
  // TODO: update load middleware to not load the admin middleware from here
  register,
  bootstrap,
  destroy,
  config: require('./config'),
  services: require('./services'),
  controllers: require('./controllers'),
  contentTypes: require('./content-types'),
};

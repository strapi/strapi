'use strict';

const register = require('./register');
const bootstrap = require('./bootstrap');
const contentTypes = require('./content-types');
const controllers = require('./controllers');
const routes = require('./routes');
const services = require('./services');
const config = require('./config');

module.exports = {
  register,
  bootstrap,
  config,
  controllers,
  routes,
  services,
  contentTypes,
};

'use strict';

const bootstrap = require('./bootstrap');
const services = require('./services');
const routes = require('./routes');
const controllers = require('./controllers');
const register = require('./register');
const config = require('./config');

module.exports = () => ({
  bootstrap,
  config,
  routes,
  controllers,
  register,
  services,
});

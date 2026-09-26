'use strict';

const config = require('./server/config');
const controllers = require('./server/controllers');
const register = require('./server/register');
const bootstrap = require('./server/bootstrap');
const routes = require('./server/routes');
const services = require('./server/services');

module.exports = () => ({
  register,
  bootstrap,
  config,
  controllers,
  routes,
  services,
});

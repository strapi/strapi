'use strict';

const bootstrap = require('./server/bootstrap');
const register = require('./server/register');
const contentTypes = require('./server/content-types');
const services = require('./server/services');
const routes = require('./server/routes');
const controllers = require('./server/controllers');

module.exports = () => ({
  register,
  bootstrap,
  routes,
  controllers,
  contentTypes,
  services,
});

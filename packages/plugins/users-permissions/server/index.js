'use strict';

const register = require('./register');
const bootstrap = require('./bootstrap');
const contentTypes = require('./content-types');
const policies = require('./policies');
const services = require('./services');
const routes = require('./routes');
const controllers = require('./controllers');
const config = require('./config');

module.exports = () => ({
  register,
  bootstrap,
  config,
  routes,
  controllers,
  contentTypes,
  policies,
  services,
});

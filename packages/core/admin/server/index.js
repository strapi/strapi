'use strict';

const bootstrap = require('./bootstrap');
const register = require('./register');
const destroy = require('./destroy');

const config = require('./config');
const policies = require('./policies');
const routes = require('./routes');
const services = require('./services');
const controllers = require('./controllers');
const contentTypes = require('./content-types');
const middlewares = require('./middlewares');

module.exports = {
  register,
  bootstrap,
  destroy,
  config,
  policies,
  routes,
  services,
  controllers,
  contentTypes,
  middlewares,
};

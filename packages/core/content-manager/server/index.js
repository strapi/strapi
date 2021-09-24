'use strict';

const bootstrap = require('./bootstrap');
const controllers = require('./controllers');
const routes = require('./routes');
const policies = require('./policies');
const services = require('./services');

module.exports = () => {
  return {
    bootstrap,
    controllers,
    routes,
    policies,
    services,
  };
};

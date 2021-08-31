'use strict';

const bootstrap = require('./server/bootstrap');
const policies = require('./server/policies');
const services = require('./server/services');
const routes = require('./server/routes');
const controllers = require('./server/controllers');

module.exports = () => {
  return {
    bootstrap,
    routes,
    controllers,
    policies,
    services,
  };
};

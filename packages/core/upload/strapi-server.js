'use strict';

const bootstrap = require('./server/bootstrap');
const contentTypes = require('./server/content-types');
const services = require('./server/services');
const routes = require('./server/routes');
const config = require('./server/config');
const controllers = require('./server/controllers');
const middlewares = require('./server/middlewares');

module.exports = () => {
  return {
    bootstrap,
    config,
    routes,
    controllers,
    middlewares,
    contentTypes,
    policies: {},
    services,
  };
};

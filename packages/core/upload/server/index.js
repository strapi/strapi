'use strict';

const register = require('./register');
const bootstrap = require('./bootstrap');
const destroy = require('./destroy');
const contentTypes = require('./content-types');
const services = require('./services');
const routes = require('./routes');
const config = require('./config');
const controllers = require('./controllers');

module.exports = () => {
  return {
    register,
    bootstrap,
    destroy,
    config,
    routes,
    controllers,
    contentTypes,
    services,
  };
};

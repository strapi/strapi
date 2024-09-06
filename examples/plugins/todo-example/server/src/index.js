'use strict';

const contentTypes = require('./content-types');
const controllers = require('./controllers');
const routes = require('./routes');
const services = require('./services');

module.exports = {
  controllers,
  routes,
  services,
  contentTypes,
};

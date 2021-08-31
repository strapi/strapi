'use strict';

const bootstrap = require('./server/bootstrap');
const services = require('./server/services');
const middlewares = require('./server/middlewares');
const config = require('./server/config');

module.exports = () => ({
  bootstrap,
  config,
  middlewares,
  services,
});

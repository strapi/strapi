'use strict';

const bootstrap = require('./server/bootstrap');
const services = require('./server/services');
const config = require('./server/config');

module.exports = (/* strapi, config */) => {
  return {
    config,
    bootstrap,
    services,
  };
};

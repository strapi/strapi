'use strict';

const bootstrap = require('./server/bootstrap');
const services = require('./server/services');

module.exports = (/* strapi, config */) => {
  return {
    bootstrap,
    services,
  };
};

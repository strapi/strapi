'use strict';

const bootstrap = require('./dist/bootstrap').default;
const services = require('./dist/services').default;
const config = require('./dist/config').default;

module.exports = (/* strapi, config */) => {
  return {
    config,
    bootstrap,
    services,
  };
};

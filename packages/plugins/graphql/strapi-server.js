'use strict';

const bootstrap = require('./server/bootstrap');
const register = require('./server/register');
const services = require('./server/services');

module.exports = (/* strapi, config */) => {
  return {
    bootstrap,
    register,
    services,
    // destroy: () => {},
    // config: {},
    // routes: [],
    // controllers: {},
    // policies: {},
    // middlewares: {},
    // contentTypes: {},
  };
};

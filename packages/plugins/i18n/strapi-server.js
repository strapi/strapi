'use strict';

const bootstrap = require('./bootstrap');
const contentTypes = require('./content-types');
const policies = require('./policies');
const services = require('./services');

module.exports = (/* env */) => {
  return {
    bootstrap,
    // register,
    destroy: () => console.log('i18n DESTROY'),
    config: {
      default: {
        olala: 'olala',
        pouet: 'pouet',
      },
      validator: () => {},
    },
    routes: [],
    controllers: {},
    middlewares: {},
    contentTypes,
    policies,
    services,
    hooks: {},
  };
};

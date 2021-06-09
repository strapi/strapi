'use strict';

const bootstrap = require('./server/bootstrap');
const contentTypes = require('./server/content-types');
const policies = require('./server/policies');
const services = require('./server/services');

// object or function. If function then pass strapi.
module.exports = () => {
  return {
    bootstrap,
    // register,
    destroy: () => console.log('i18n DESTROY'),
    config: {
      default: () => ({
        olala: 'olala',
        pouet: 'pouet',
        featureA: true,
      }),
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

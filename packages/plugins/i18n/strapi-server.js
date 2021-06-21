'use strict';

const bootstrap = require('./server/bootstrap');
const contentTypes = require('./server/content-types');
const policies = require('./server/policies');
const services = require('./server/services');
// const routes = require('./server/routes');

// object or function. If function then pass strapi.
module.exports = () => {
  return {
    register: () => {
      // extend entityService
      // route.add('/giveBestCountries', { action: giveBestCountries });
      // route.add('/giveBestCountries', [policies.get('plugins::users-permissions.permissions')],
      //   handler: giveBestCountries,
      // });
      // route.add('/giveBestCountries', (ctx, {  }) => {
      //   ctx.entityService('countries').giveBestCountries();
      // });
      //
      // addQuery('giveBestCountries', {
      //   args: ,
      //   resolve: ,
      //   type: ,
      // });
      //
      // registerRoute('/countries', {
      //   method: 'get',
      //   handler: () => {},
      // })
    },
    bootstrap,
    // routes,
    // controllers: {},
    middlewares: {},
    contentTypes,
    policies,
    services,
    // middlewares,
  };
};

// create, update, delete, read

// modifier une route existance CRUD
// Ajouter des nouvelles routes / query graphql

//

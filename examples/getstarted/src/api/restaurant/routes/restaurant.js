'use strict';

module.exports = {
  prefix: '/restaurants',
  routes: [
    {
      method: 'GET',
      path: '/',
      handler: 'restaurant.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/:id',
      handler: 'restaurant.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/',
      handler: 'restaurant.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/:id',
      handler: 'restaurant.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/:id',
      handler: 'restaurant.delete',
      config: {
        policies: [],
      },
    },
  ],
};

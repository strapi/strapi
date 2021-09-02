'use strict';

module.exports = {
  prefix: '/restaurants',
  routes: [
    {
      method: 'GET',
      path: '/restaurants',
      handler: 'restaurant.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/restaurants/:id',
      handler: 'restaurant.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/restaurants',
      handler: 'restaurant.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/restaurants/:id',
      handler: 'restaurant.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/restaurants/:id',
      handler: 'restaurant.delete',
      config: {
        policies: [],
      },
    },
  ],
};

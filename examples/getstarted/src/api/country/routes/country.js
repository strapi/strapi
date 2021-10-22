'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/countries',
      handler: 'country.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/countries/:id',
      handler: 'country.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/countries',
      handler: 'country.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/countries/:id',
      handler: 'country.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/countries/:id',
      handler: 'country.delete',
      config: {
        policies: [],
      },
    },
  ],
};

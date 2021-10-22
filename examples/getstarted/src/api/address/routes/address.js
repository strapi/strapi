'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/addresses',
      handler: 'address.find',
      config: {
        middlewares: ['api::address.address-middleware'],
        policies: ['address'],
      },
    },
    {
      method: 'GET',
      path: '/addresses/:id',
      handler: 'address.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/addresses',
      handler: 'address.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/addresses/:id',
      handler: 'address.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/addresses/:id',
      handler: 'address.delete',
      config: {
        policies: [],
      },
    },
  ],
};

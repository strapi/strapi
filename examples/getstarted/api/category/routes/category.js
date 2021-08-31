'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/categories',
      handler: 'category.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/categories/:id',
      handler: 'category.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/categories',
      handler: 'category.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/categories/:id',
      handler: 'category.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/categories/:id',
      handler: 'category.delete',
      config: {
        policies: [],
      },
    },
  ],
};

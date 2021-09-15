'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/likes',
      handler: 'like.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/likes/:id',
      handler: 'like.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/likes',
      handler: 'like.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/likes/:id',
      handler: 'like.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/likes/:id',
      handler: 'like.delete',
      config: {
        policies: [],
      },
    },
  ],
};

'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/menusections',
      handler: 'menusection.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/menusections/:id',
      handler: 'menusection.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/menusections',
      handler: 'menusection.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/menusections/:id',
      handler: 'menusection.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/menusections/:id',
      handler: 'menusection.delete',
      config: {
        policies: [],
      },
    },
  ],
};

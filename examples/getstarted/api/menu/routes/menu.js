'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/menus',
      handler: 'menu.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/menus/:id',
      handler: 'menu.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/menus',
      handler: 'menu.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/menus/:id',
      handler: 'menu.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/menus/:id',
      handler: 'menu.delete',
      config: {
        policies: [],
      },
    },
  ],
};

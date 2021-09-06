'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/users/count',
      handler: 'user.count',
    },
    {
      method: 'GET',
      path: '/users',
      handler: 'user.find',
    },
    {
      method: 'GET',
      path: '/users/me',
      handler: 'user.me',
    },
  ],
  // TODO: add connection / auto registration routes
};

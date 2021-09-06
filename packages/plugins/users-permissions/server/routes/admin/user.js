'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/users/count',
    handler: 'user.count',
    config: {
      prefix: '',
    },
  },
  {
    method: 'GET',
    path: '/users',
    handler: 'user.find',
    config: {
      prefix: '',
    },
  },
  {
    method: 'GET',
    path: '/users/me',
    handler: 'user.me',
    config: {
      prefix: '',
    },
  },
  {
    method: 'GET',
    path: '/users/:id',
    handler: 'user.findOne',
    config: {
      prefix: '',
    },
  },
  {
    method: 'POST',
    path: '/users',
    handler: 'user.create',
    config: {
      prefix: '',
    },
  },
  {
    method: 'PUT',
    path: '/users/:id',
    handler: 'user.update',
    config: {
      prefix: '',
    },
  },
  {
    method: 'DELETE',
    path: '/users/:id',
    handler: 'user.destroy',
    config: {
      prefix: '',
    },
  },
];

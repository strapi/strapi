'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/',
      handler: 'upload.upload',
    },
    {
      method: 'GET',
      path: '/files/count',
      handler: 'upload.count',
    },
    {
      method: 'GET',
      path: '/files',
      handler: 'upload.find',
    },
    {
      method: 'GET',
      path: '/files/:id',
      handler: 'upload.findOne',
    },
    {
      method: 'DELETE',
      path: '/files/:id',
      handler: 'upload.destroy',
    },
  ],
};

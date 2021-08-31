'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/settings',
    handler: 'upload.getSettings',
    config: {
      policies: [],
    },
  },
  {
    method: 'PUT',
    path: '/settings',
    handler: 'upload.updateSettings',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/',
    handler: 'upload.upload',
    config: {
      policies: [],
      description: 'upload a file',
      tag: {
        plugin: 'upload',
        name: 'File',
      },
    },
  },
  {
    method: 'GET',
    path: '/files/count',
    handler: 'upload.count',
    config: {
      policies: [],
      description: 'Retrieve the total number of uploaded files',
      tag: {
        plugin: 'upload',
        name: 'File',
      },
    },
  },
  {
    method: 'GET',
    path: '/files',
    handler: 'upload.find',
    config: {
      policies: [],
      description: 'Retrieve all file documents',
      tag: {
        plugin: 'upload',
        name: 'File',
      },
    },
  },
  {
    method: 'GET',
    path: '/files/:id',
    handler: 'upload.findOne',
    config: {
      policies: [],
      description: 'Retrieve a single file depending on its id',
      tag: {
        plugin: 'upload',
        name: 'File',
      },
    },
  },
  {
    method: 'GET',
    path: '/search/:id',
    handler: 'upload.search',
    config: {
      policies: [],
      description: 'Search for an uploaded file',
      tag: {
        plugin: 'upload',
        name: 'File',
      },
    },
  },
  {
    method: 'DELETE',
    path: '/files/:id',
    handler: 'upload.destroy',
    config: {
      policies: [],
      description: 'Delete an uploaded file',
      tag: {
        plugin: 'upload',
        name: 'File',
      },
    },
  },
];

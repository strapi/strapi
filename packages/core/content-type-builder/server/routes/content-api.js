'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/content-types',
      handler: 'content-types.getContentTypes',
    },
    {
      method: 'GET',
      path: '/content-types/:uid',
      handler: 'content-types.getContentType',
    },
    {
      method: 'GET',
      path: '/components',
      handler: 'components.getComponents',
    },
    {
      method: 'GET',
      path: '/components/:uid',
      handler: 'components.getComponent',
    },
  ],
};

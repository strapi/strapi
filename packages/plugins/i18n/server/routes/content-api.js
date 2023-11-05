'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/locales',
      handler: 'locales.find',
    },
    {
      method: 'GET',
      path: '/locales/:id',
      handler: 'locales.findOne',
    },
  ],
};

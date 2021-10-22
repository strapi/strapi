'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/kitchensinks',
      handler: 'kitchensink.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/kitchensinks/:id',
      handler: 'kitchensink.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/kitchensinks',
      handler: 'kitchensink.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/kitchensinks/:id',
      handler: 'kitchensink.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/kitchensinks/:id',
      handler: 'kitchensink.delete',
      config: {
        policies: [],
      },
    },
  ],
};

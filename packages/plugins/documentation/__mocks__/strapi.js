'use strict';

const strapi = {
  plugins: {
    'users-permissions': {
      contentTypes: {
        role: {
          attributes: {
            name: {
              type: 'string',
            },
          },
        },
      },
      routes: {
        'content-api': {
          routes: [],
        },
      },
    },
  },
  api: {
    restaurant: {
      contentTypes: {
        restaurant: {
          attributes: {
            name: {
              type: 'string',
            },
          },
        },
      },
      routes: {
        restaurant: { routes: [] },
      },
    },
  },
  contentType: () => ({ info: {}, attributes: { test: { type: 'string' } } }),
};

module.exports = strapi;

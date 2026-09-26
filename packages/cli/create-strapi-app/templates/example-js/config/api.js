'use strict';

const { factories } = require('@strapi/strapi');

module.exports = factories.defineApiConfig({
  rest: {
    defaultLimit: 25,
    maxLimit: 100,
    withCount: true,
    strictParams: true,
  },
  documents: {
    strictParams: true,
    strictRelations: true,
  },
});

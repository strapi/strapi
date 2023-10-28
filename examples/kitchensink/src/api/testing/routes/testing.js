'use strict';

/**
 * testing router for api
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::testing.testing');

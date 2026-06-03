'use strict';

/**
 * unique router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::unique.unique');

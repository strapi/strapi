'use strict';

/**
 * testing service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::testing.testing');

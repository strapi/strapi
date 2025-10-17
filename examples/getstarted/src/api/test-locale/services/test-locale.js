'use strict';

/**
 * test-locale service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::test-locale.test-locale');

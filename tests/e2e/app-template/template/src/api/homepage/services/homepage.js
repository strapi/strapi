'use strict';

/**
 * homepage service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::homepage.homepage');

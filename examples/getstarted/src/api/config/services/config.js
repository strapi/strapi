'use strict';

/**
 * config service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::config.config');

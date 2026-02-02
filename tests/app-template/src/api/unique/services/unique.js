'use strict';

/**
 * unique service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::unique.unique');

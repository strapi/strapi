'use strict';

/**
 * page service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::page.page');

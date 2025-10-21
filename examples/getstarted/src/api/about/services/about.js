'use strict';

/**
 * about service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::about.about');

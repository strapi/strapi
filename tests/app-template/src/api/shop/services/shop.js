'use strict';

/**
 * shop service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::shop.shop');

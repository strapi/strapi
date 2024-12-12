'use strict';

/**
 * birthday service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::birthday.birthday');

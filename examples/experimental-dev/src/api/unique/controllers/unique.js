'use strict';

/**
 * unique controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::unique.unique');

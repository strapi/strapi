'use strict';

/**
 * testing controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::testing.testing');

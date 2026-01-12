/**
 * complex service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::complex.complex');

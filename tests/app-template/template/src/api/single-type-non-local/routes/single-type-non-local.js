/**
 * single-type-non-local router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::single-type-non-local.single-type-non-local');

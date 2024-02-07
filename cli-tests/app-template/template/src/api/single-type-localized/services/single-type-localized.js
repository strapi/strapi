/**
 * single-type-localized service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::single-type-localized.single-type-localized');

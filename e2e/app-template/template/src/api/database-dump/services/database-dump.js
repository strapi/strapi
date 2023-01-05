const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::database-dump.database-dump');

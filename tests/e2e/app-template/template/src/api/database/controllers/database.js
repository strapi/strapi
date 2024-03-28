const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::database.database', ({ strapi }) => {
  return {
    async dump(ctx) {
      const databaseService = strapi.service('api::database.database');

      await databaseService.dumpDatabaseTables();

      ctx.send(200);
    },
  };
});

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::database.database', ({ strapi }) => {
  return {
    async dumpDatabaseTables() {
      const db = strapi.db.getConnection(); // knexjs
      const metadata = strapi.db.metadata;
      const promises = [];

      metadata.forEach((contentType) => {
        const tableName = contentType.tableName;

        // We want to keep the core strapi settings as well as admin users +
        // roles. Otherwise the test specs would require a lot of setup each time
        if (tableName.startsWith('strapi_') || tableName.startsWith('admin_')) return;

        console.log('DUMPING TABLE', tableName);

        promises.push(db.from(tableName).del());
      });

      await Promise.all(promises);
    },
  };
});

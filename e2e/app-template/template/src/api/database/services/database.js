const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::database.database', ({ strapi }) => {
  return {
    async dumpDatabaseTables() {
      const db = strapi.db.getConnection(); // knexjs
      const metadata = strapi.db.metadata;
      const promises = [];

      metadata.forEach((contentType) => {
        const tableName = contentType.tableName;

        if (tableName.startsWith('strapi_')) return;

        console.log('DUMPING TABLE', tableName);

        promises.push(db.from(tableName).del());
      });

      await Promise.all(promises);
    },
  };
});

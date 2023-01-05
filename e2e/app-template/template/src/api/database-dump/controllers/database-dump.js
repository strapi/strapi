const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::database-dump.database-dump', ({ strapi }) => {
  return {
    async dump(ctx) {
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

      ctx.send(200);
    },
  };
});

'use strict';

const createStorage = (opts = {}) => {
  const { db, tableName = 'strapi_migrations' } = opts;

  const hasMigrationTable = () => db.getSchemaConnection().hasTable(tableName);

  const createMigrationTable = () => {
    return db.getSchemaConnection().createTable(tableName, table => {
      table.increments('id');
      table.string('name');
      table.datetime('time', { useTz: false });
    });
  };

  return {
    async logMigration({ name }) {
      await db
        .getConnection()
        .insert({
          name,
          time: new Date(),
        })
        .into(tableName);
    },

    async unlogMigration({ name }) {
      await db
        .getConnection(tableName)
        .del()
        .where({ name });
    },

    async executed() {
      if (!(await hasMigrationTable())) {
        await createMigrationTable();
        return [];
      }

      const logs = await db
        .getConnection(tableName)
        .select()
        .from(tableName)
        .orderBy('time');

      return logs.map(log => log.name);
    },
  };
};

module.exports = createStorage;

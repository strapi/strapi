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
    async logMigration(migrationName) {
      await db
        .getConnection()
        .insert({
          name: migrationName,
          time: new Date(),
        })
        .into(tableName);
    },

    async unlogMigration(migrationName) {
      await db
        .getConnection(tableName)
        .del()
        .where({ name: migrationName });
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

'use strict';

const createStorage = (opts = {}) => {
  const tableName = opts.tableName || 'strapi_migrations';
  const knex = opts.db.connection;

  const hasMigrationTable = () => knex.schema.hasTable(tableName);

  const createMigrationTable = () => {
    return knex.schema.createTable(tableName, table => {
      table.increments('id');
      table.string('name');
      table.datetime('time', { useTz: false });
    });
  };

  return {
    async logMigration(migrationName) {
      await knex
        .insert({
          name: migrationName,
          time: new Date(),
        })
        .into(tableName);
    },

    async unlogMigration(migrationName) {
      await knex(tableName)
        .del()
        .where({ name: migrationName });
    },

    async executed() {
      if (!(await hasMigrationTable())) {
        await createMigrationTable();
        return [];
      }

      const logs = await knex
        .select()
        .from(tableName)
        .orderBy('time');

      return logs.map(log => log.name);
    },
  };
};

module.exports = createStorage;

import type { Database } from '..';

export interface Options {
  db: Database;
  tableName: string;
}

export const createStorage = (opts: Options) => {
  const { db, tableName } = opts;

  const hasMigrationTable = () => db.getSchemaConnection().hasTable(tableName);

  const createMigrationTable = () => {
    return db.getSchemaConnection().createTable(tableName, (table) => {
      table.increments('id');
      table.string('name');
      table.datetime('time', { useTz: false });
    });
  };

  return {
    async logMigration({ name }: { name: string }) {
      await db
        .getConnection()
        .insert({
          name,
          time: new Date(),
        })
        .into(tableName);
    },

    async unlogMigration({ name }: { name: string }) {
      await db.getConnection(tableName).del().where({ name });
    },

    async executed() {
      if (!(await hasMigrationTable())) {
        await createMigrationTable();
        return [];
      }

      const logs = await db.getConnection(tableName).select().from(tableName).orderBy('time');

      return logs.map((log: { name: string }) => log.name);
    },
  };
};

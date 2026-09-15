import type { Database } from '..';

export interface Options {
  db: Database;
  tableName: string;
}

const DUPLICATE_ENTRY_ERROR_CODES = new Set(['23505', 'ER_DUP_ENTRY', 'SQLITE_CONSTRAINT_UNIQUE']);

const isDuplicateEntryError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { code?: string; message?: string };
  if (err.code && DUPLICATE_ENTRY_ERROR_CODES.has(err.code)) {
    return true;
  }

  const message = err.message?.toLowerCase() ?? '';
  return message.includes('duplicate key') || message.includes('unique constraint failed');
};

const isExistingIndexError = (error: unknown): boolean => {
  const message = (error as { message?: string }).message?.toLowerCase() ?? '';
  return (
    message.includes('already exists') ||
    message.includes('duplicate key name') ||
    message.includes('duplicate index')
  );
};

const getNameUniqueIndex = (tableName: string) => `${tableName}_name_unique`;

export const createStorage = (opts: Options) => {
  const { db, tableName } = opts;
  const nameUniqueIndex = getNameUniqueIndex(tableName);

  const hasMigrationTable = () => db.getSchemaConnection().hasTable(tableName);

  const createMigrationTable = () => {
    return db.getSchemaConnection().createTable(tableName, (table) => {
      table.increments('id');
      table.string('name').notNullable().unique({ indexName: nameUniqueIndex });
      table.datetime('time', { useTz: false });
    });
  };

  const ensureNameUniqueIndex = async () => {
    try {
      await db.getSchemaConnection().alterTable(tableName, (table) => {
        table.unique(['name'], { indexName: nameUniqueIndex });
      });
    } catch (error) {
      if (isExistingIndexError(error)) {
        return;
      }

      throw error;
    }
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

    async tryClaimMigration({ name }: { name: string }) {
      try {
        await db
          .getConnection()
          .insert({
            name,
            time: new Date(),
          })
          .into(tableName);
        return true;
      } catch (error) {
        if (isDuplicateEntryError(error)) {
          return false;
        }

        throw error;
      }
    },

    async unlogMigration({ name }: { name: string }) {
      await db.getConnection(tableName).del().where({ name });
    },

    async executed() {
      if (!(await hasMigrationTable())) {
        await createMigrationTable();
        return [];
      }

      await ensureNameUniqueIndex();

      const logs = await db.getConnection(tableName).select().from(tableName).orderBy('time');

      return logs.map((log: { name: string }) => log.name);
    },
  };
};

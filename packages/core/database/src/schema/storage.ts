import crypto from 'crypto';

import type { Database } from '..';
import type { Schema } from './types';

const TABLE_NAME = 'strapi_database_schema';

export default (db: Database) => {
  let tableExists = false;

  const checkTableExists = async () => {
    if (tableExists) {
      return;
    }

    const exists = await db.getSchemaConnection().hasTable(TABLE_NAME);
    if (!exists) {
      await db.getSchemaConnection().createTable(TABLE_NAME, (t) => {
        t.increments('id');
        t.json('schema');
        t.datetime('time', { useTz: false });
        t.string('hash');
      });
    }

    tableExists = true;
  };

  return {
    async read(): Promise<{
      id: number;
      time: Date;
      hash: string;
      schema: Schema;
    } | null> {
      await checkTableExists();

      // NOTE: We get the ID first before fetching the exact entry for performance on MySQL/MariaDB
      // See: https://github.com/strapi/strapi/issues/20312
      const getSchemaID = await db
        .getConnection()
        .select('id')
        .from(TABLE_NAME)
        .orderBy('time', 'DESC')
        .first();

      if (!getSchemaID) {
        return null;
      }

      const res = await db
        .getConnection()
        .select('*')
        .from(TABLE_NAME)
        .where({ id: getSchemaID.id })
        .first();

      if (!res) {
        return null;
      }

      const parsedSchema = typeof res.schema === 'object' ? res.schema : JSON.parse(res.schema);

      return {
        ...res,
        schema: parsedSchema,
      };
    },

    hashSchema(schema: Schema) {
      // Sort tables by name for deterministic hashing regardless of insertion order
      const sorted = {
        ...schema,
        tables: schema.tables.sort((a, b) => a.name.localeCompare(b.name)),
      };
      return crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
    },

    async add(schema: Schema) {
      await checkTableExists();

      // NOTE: we can remove this to add history
      await db.getConnection(TABLE_NAME).delete();

      const time = new Date();

      await db
        .getConnection()
        .insert({
          schema: JSON.stringify(schema),
          hash: this.hashSchema(schema),
          time,
        })
        .into(TABLE_NAME);
    },

    async clear() {
      await checkTableExists();

      await db.getConnection(TABLE_NAME).truncate();
    },
  };
};

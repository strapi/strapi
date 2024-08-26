import crypto from 'crypto';

import type { Database } from '..';
import type { Schema } from './types';

const TABLE_NAME = 'strapi_database_schema';

export default (db: Database) => {
  const hasSchemaTable = () => db.getSchemaConnection().hasTable(TABLE_NAME);

  const createSchemaTable = () => {
    return db.getSchemaConnection().createTable(TABLE_NAME, (t) => {
      t.increments('id');
      t.json('schema');
      t.datetime('time', { useTz: false });
      t.string('hash');
    });
  };

  const checkTableExists = async () => {
    if (!(await hasSchemaTable())) {
      await createSchemaTable();
    }
  };

  return {
    async read(): Promise<{
      id: number;
      time: Date;
      hash: string;
      schema: Schema;
    } | null> {
      await checkTableExists();

      const res = await db
        .getConnection()
        .select('*')
        .from(TABLE_NAME)
        .orderBy('time', 'DESC')
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
      return crypto.createHash('md5').update(JSON.stringify(schema)).digest('hex');
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

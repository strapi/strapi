'use strict';

const crypto = require('crypto');

const TABLE_NAME = 'strapi_database_schema';

module.exports = (db) => {
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
    async read() {
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

    hashSchema(schema) {
      return crypto.createHash('md5').update(JSON.stringify(schema)).digest('hex');
    },

    async add(schema) {
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

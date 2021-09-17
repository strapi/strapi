'use strict';

const crypto = require('crypto');

const TABLE_NAME = 'strapi_database_schema';

module.exports = db => {
  const hasSchemaTable = () => db.connection.schema.hasTable(TABLE_NAME);

  const createSchemaTable = () => {
    return db.connection.schema.createTable(TABLE_NAME, t => {
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

      const res = await db.connection
        .select('*')
        .from(TABLE_NAME)
        .orderBy('time', 'DESC')
        .first();

      if (!res) {
        return null;
      }

      return typeof res.schema === 'object' ? res.schema : JSON.parse(res.schema);
    },

    hashSchema(schema) {
      return crypto
        .createHash('md5')
        .update(JSON.stringify(schema))
        .digest('hex');
    },

    async add(schema) {
      await checkTableExists();

      // NOTE: we can remove this to add history
      await db.connection(TABLE_NAME).delete();

      const time = new Date();

      await db.connection(TABLE_NAME).insert({
        schema: JSON.stringify(schema),
        hash: this.hashSchema(schema),
        time,
      });
    },

    async clear() {
      await checkTableExists();

      await db.connection(TABLE_NAME).truncate();
    },
  };
};

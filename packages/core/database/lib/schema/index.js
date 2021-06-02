'use strict';

const createSchemaBuilder = require('./builder');

const createSchemaProvider = db => {
  /*
    1. Load schema from DB
    3. Run migrations on old schema
    2. Build new schema
    4. Diff the two
    5. Apply diff
  */

  return {
    get builder() {
      return createSchemaBuilder(db);
    },
    async sync() {
      // TODO: sync schema instead of creating it
      await this.builder.dropSchema();
      await this.builder.createSchema();
    },
  };
};

module.exports = createSchemaProvider;

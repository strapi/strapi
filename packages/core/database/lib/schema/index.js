'use strict';

const createSchemaBuilder = require('./builder');
const createSchemaStorage = require('./schema-storage');
const createSchemaDiff = require('./schema-diff');
const { metadataToSchema, createTable } = require('./schema');

const addInternalTables = schema => {
  schema.addTable(
    createTable({
      tableName: 'strapi_database_schema',
      attributes: {
        id: {
          type: 'increments',
        },
        schema: {
          type: 'json',
        },
        createdAt: {
          type: 'datetime',
        },
      },
    })
  );
};

const createSchemaProvider = db => {
  const currentSchema = metadataToSchema(db.metadata);

  // Add Internal tables to schema
  addInternalTables(currentSchema);

  return {
    builder: createSchemaBuilder(db),
    schemaStorage: createSchemaStorage(db),
    schemaDiff: createSchemaDiff(db),

    /**
     * Drops the database schema
     */
    async drop() {
      const DBSchema = await this.schemaStorage.read();

      if (!DBSchema) {
        return;
      }

      await this.builder.dropSchema(DBSchema);
    },

    /**
     * Creates the database schema
     */
    async create() {
      await this.builder.createSchema(currentSchema);
      await this.schemaStorage.create(currentSchema);
    },

    /**
     * Resets the database schema
     */
    async reset() {
      await this.drop();
      await this.create();
    },

    // TODO: support options to migrate softly or forcefully
    // TODO: support option to disable auto migration & run a CLI command instead to avoid doing it at startup
    async sync() {
      // load previous schema
      const DBSchema = await this.schemaStorage.read();

      if (!DBSchema) {
        return this.create();
      }

      const schemaInspect = await db.dialect.schemaInspector.getSchema();

      // run migrations
      db.migration.up();

      // diff schema
      const { status, diff } = this.schemaDiff.diff(schemaInspect, currentSchema);

      if (status === 'UNCHANGED') {
        return;
      }

      // update schema
      await this.builder.updateSchema(diff);

      // persist new schema
      await this.schemaStorage.update(currentSchema);
    },
  };
};

module.exports = createSchemaProvider;

'use strict';

const createSchemaBuilder = require('./builder');
const createSchemaDiff = require('./schema-diff');
const { metadataToSchema } = require('./schema');

const createSchemaProvider = db => {
  const schema = metadataToSchema(db.metadata);

  return {
    builder: createSchemaBuilder(db),
    schemaDiff: createSchemaDiff(db),

    /**
     * Drops the database schema
     */
    async drop() {
      const DBSchema = await db.dialect.schemaInspector.getSchema();
      await this.builder.dropSchema(DBSchema);
    },

    /**
     * Creates the database schema
     */
    async create() {
      await this.builder.createSchema(schema);
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
    // TODO: Allow keeping extra indexes / extra tables / extra columns (globally or on a per table basis)
    async sync() {
      // Run users migrations
      db.migration.up();

      // Read schema from DB
      const DBSchema = await db.dialect.schemaInspector.getSchema();

      // Diff schema
      const { status, diff } = this.schemaDiff.diff(DBSchema, schema);

      if (status === 'UNCHANGED') {
        return;
      }

      // Update schema
      await this.builder.updateSchema(diff);
    },
  };
};

module.exports = createSchemaProvider;

'use strict';

const debug = require('debug')('strapi::database');

const createSchemaBuilder = require('./builder');
const createSchemaDiff = require('./diff');
const createSchemaStorage = require('./storage');
const { metadataToSchema } = require('./schema');

/**
 * @type {import('.').default}
 */
const createSchemaProvider = (db) => {
  const schema = metadataToSchema(db.metadata);

  return {
    builder: createSchemaBuilder(db),
    schemaDiff: createSchemaDiff(db),
    schemaStorage: createSchemaStorage(db),

    /**
     * Drops the database schema
     */
    async drop() {
      debug('Dropping database schema');

      const DBSchema = await db.dialect.schemaInspector.getSchema();
      await this.builder.dropSchema(DBSchema);
    },

    /**
     * Creates the database schema
     */
    async create() {
      debug('Created database schema');
      await this.builder.createSchema(schema);
    },

    /**
     * Resets the database schema
     */
    async reset() {
      debug('Resetting database schema');
      await this.drop();
      await this.create();
    },

    async syncSchema() {
      debug('Synchronizing database schema');

      const DBSchema = await db.dialect.schemaInspector.getSchema();

      const { status, diff } = await this.schemaDiff.diff(DBSchema, schema);

      if (status === 'CHANGED') {
        await this.builder.updateSchema(diff);
      }

      await this.schemaStorage.add(schema);
    },

    // TODO: support options to migrate softly or forcefully
    // TODO: support option to disable auto migration & run a CLI command instead to avoid doing it at startup
    // TODO: Allow keeping extra indexes / extra tables / extra columns (globally or on a per table basis)
    async sync() {
      if (await db.migrations.shouldRun()) {
        debug('Found migrations to run');
        await db.migrations.up();

        return this.syncSchema();
      }

      const oldSchema = await this.schemaStorage.read();

      if (!oldSchema) {
        debug('Schema not persisted yet');
        return this.syncSchema();
      }

      const { hash: oldHash } = oldSchema;
      const hash = await this.schemaStorage.hashSchema(schema);

      if (oldHash !== hash) {
        debug('Schema changed');

        return this.syncSchema();
      }

      debug('Schema unchanged');
    },
  };
};

module.exports = createSchemaProvider;

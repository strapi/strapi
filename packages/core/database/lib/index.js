'use strict';

const { getDialect } = require('./dialects');
const createSchemaProvider = require('./schema');
const createMetadata = require('./metadata');
const { createEntityManager } = require('./entity-manager');
const { createMigrationsProvider } = require('./migrations');
const { createLifecyclesProvider } = require('./lifecycles');
const createConnection = require('./connection');
const errors = require('./errors');

// TODO: move back into strapi
const { transformContentTypes } = require('./utils/content-types');
const { getJoinTableName } = require('./metadata/relations');
const types = require('./types');

class Database {
  constructor(config) {
    this.metadata = createMetadata(config.models);

    this.config = {
      connection: {},
      settings: {
        forceMigration: true,
      },
      ...config,
    };

    this.dialect = getDialect(this);
    this.dialect.configure();

    this.connection = createConnection(this.config.connection);

    this.dialect.initialize();

    this.schema = createSchemaProvider(this);

    this.migrations = createMigrationsProvider(this);
    this.lifecycles = createLifecyclesProvider(this);

    this.entityManager = createEntityManager(this);
  }

  query(uid) {
    if (!this.metadata.has(uid)) {
      throw new Error(`Model ${uid} not found`);
    }

    return this.entityManager.getRepository(uid);
  }

  getConnection(tableName) {
    const schema = this.connection.getSchemaName();
    const connection = tableName ? this.connection(tableName) : this.connection;
    return schema ? connection.withSchema(schema) : connection;
  }

  getSchemaConnection(trx = this.connection) {
    const schema = this.connection.getSchemaName();
    return schema ? trx.schema.withSchema(schema) : trx.schema;
  }

  transaction() {
    return this.connection.transaction();
  }

  queryBuilder(uid) {
    return this.entityManager.createQueryBuilder(uid);
  }

  async destroy() {
    await this.lifecycles.clear();
    await this.connection.destroy();
  }
}

// TODO: Do the same for repeated mappedBy relations
const getLinks = ({ db }) => {
  const relationsToUpdate = {};

  db.metadata.forEach((contentType) => {
    const attributes = contentType.attributes;

    // For each relation type, add the joinTable name to tablesToUpdate
    Object.values(attributes).forEach((attribute) => {
      if (!types.isRelation(attribute.type)) return;

      if (attribute.inversedBy) {
        const invRelation = db.metadata.get(attribute.target).attributes[attribute.inversedBy];

        // Both relations use inversedBy
        if (invRelation?.inversedBy) {
          relationsToUpdate[attribute.joinTable.name] = {
            relation: attribute,
            invRelation,
          };
        }
      }
    });
  });

  return Object.values(relationsToUpdate);
};

// const isLinkTableEmpty = async (db, linkTableName) => {
//   const result = await db.getConnection().count('* as count').from(linkTableName);
//   return result.count === 0;
// };

// TODO: move into strapi
Database.transformContentTypes = transformContentTypes;
Database.init = async (config) => {
  const db = new Database(config);

  // TODO: Create validations folder for this.
  const links = getLinks({ db });

  const errorList = [];

  for (const { relation, invRelation } of links) {
    // Generate the join table name based on the relation target
    // table and attribute name.
    const joinTableName = getJoinTableName(
      db.metadata.get(relation.target).tableName,
      relation.inversedBy
    );

    const contentType = db.metadata.get(invRelation.target);
    const invContentType = db.metadata.get(relation.target);

    // If both sides use inversedBy
    // TODO: Same for mappedBy
    if (relation.inversedBy && invRelation.inversedBy) {
      // If the generated join table name is the same as the one assigned in relation.joinTable,
      // relation is on the inversed side of the bidirectional relation.
      // and the other is on the owner side.
      if (joinTableName === relation.joinTable.name) {
        errorList.push(
          `Error on attribute "${invRelation.inversedBy}" in model "${invContentType.tableName}"(${invContentType.uid}):` +
            ` One of the sides of the relationship must be the owning side. You should use mappedBy` +
            ` instead of inversedBy in the relation "${invRelation.inversedBy}".`
        );
      } else {
        errorList.push(
          `Error on attribute "${relation.inversedBy}" in model "${contentType.tableName}"(${contentType.uid}):` +
            ` One of the sides of the relationship must be the owning side. You should use mappedBy` +
            ` instead of inversedBy in the relation "${relation.inversedBy}".`
        );
      }
    }
  }

  if (errorList.length > 0) {
    errorList.forEach((error) => strapi.log.error(error));
    throw new Error('There are errors in some of your models. Please check the logs above.');
  }

  return db;
};

module.exports = {
  Database,
  errors,
};

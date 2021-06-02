'use strict';

const util = require('util');

const knex = require('knex');

const createSchemaProvider = require('./schema');
const createMetadata = require('./metadata');
// const Configuration = require('./configuration');
// const { resolveConnector } = require('./connector');

/*

strapi.db = new Database({
  connector: 'my-connector'
  connection: {
    client: 'sqlite',
    settings: {},
    ...
  },
  models: [],
})

db.query('article').create();


db.migration.create();
db.migration.up();
db.migration.down();

db.seed.run();
db.seed.create();

db.exporter.dump()
db.importer.restore()

db.schema.addField
db.schema.removeField
db.schema.addCollection
db.schema.removeCollection


Init
---
new DB() -> new Config() -> new Connector()



Sync
---
the database is not initialized (not created / or empty)
strapi schema:create schema:drop schema:update
auto create / initiliazed ? or a cli command ?


generate schema from entities
apply schema to db (programmaticaly or via CLI)

schema.sync()
for each collection
check if !exists
  then create
  else update -> Migration ???

clean -> delete non existing collections from db (sync force)

The database already exsits & has been initialized




Schema
---

mutliple models -> schema


article:
  seo:
    type: component
  content:
    type: dynamiczone
  cover:
    type: media
  category:
    type: relation
    relation: manyToOne
    target: category
    dominant: true
  metadata:
    type: json
  title:
    type: string
    connectorOption:
      type: decimal


category:
  title: string
  articles: relation(article)

core_store:
  key: string
  value: json

seo
  key: string
  value: string


SQL schema:

articles
articles_components
articles_category__categories_articles -> ???

files_morph
files

categories

components_seos

core_store

Scenarios for migrations

- User edit a CT in the Admin -> should we update the DB in place ? or dump a migration file

*/

const createQueryBuilder = (uid, db) => {
  const { tableName } = db.metadata.get(uid);

  let query = db.connection(tableName).select();

  return {
    count(...args) {
      query = query.count(...args);
      return this;
    },

    where() {
      // smart conditions
      // query = query.where()
      return this;
    },

    select(args) {
      query = query.select(args);
    },

    limit(args) {
      query = query.limit(args);
    },

    offset(args) {
      query = query.offset(args);
    },

    populate() {
      // all the magic happens here
    },

    query(params) {
      const { where, select, limit, offset, populate } = params;

      if (where) {
        this.where(where);
      }

      if (select) {
        this.select(select);
      }

      if (limit) {
        this.limit(limit);
      }

      if (offset) {
        this.offset(offset);
      }

      return this;
    },

    async execute() {
      const results = await query();

      // handle populate now
      return results;
    },
  };
};

const createEntityManager = db => {
  const repoMap = {};

  return {
    async findOne(...args) {
      const results = await this.findMany(...args);

      return results[0];
    },

    // should we name it findOne because people are used to it ?
    async findMany(uid, params) {
      const qb = this.createQueryBuilder(uid).query(params);

      return await qb.execute();
    },

    // support search directly in find & count -> a search param ? a different feature with a search tables rather

    async findWithCount(...args) {
      const entities = await this.findMany(args);
      const count = await this.count(args);

      return [entities, count];
    },

    async count(uid, params) {
      const qb = this.createQueryBuilder(uid).query(params);

      return qb.count().execute();
    },

    create() {
      // create entry in DB
      // create relation associations or move this to the entity service & call attach on the repo instead
    },

    createMany() {},

    update() {},
    updateMany() {},

    delete() {},
    deleteMany() {},

    // populate already loaded entry
    populate() {},

    // method to work with components & dynamic zones
    addComponent() {},
    removeComponent() {},
    setComponent() {},

    // method to work with relations
    attachRelation() {},
    detachRelation() {},
    setRelation() {},

    // cascading
    // aggregations
    // -> avg
    // -> min
    // -> max
    // -> grouping

    // formulas
    // custom queries

    // utilities
    // -> format
    // -> parse
    // -> map result
    // -> map input
    // -> validation

    // extra features
    // -> virtuals
    // -> private
    getQueryBuilder(uid) {
      return createQueryBuilder(uid, db);
    },

    getRepository(uid) {
      if (!repoMap[uid]) {
        repoMap[uid] = createRepository(uid, db);
      }

      return repoMap[uid];
    },
  };
};

const createRepository = (uid, db) => {
  return {
    find(...args) {
      return db.em.find(uid, ...args);
    },
  };
};

const entityService = () => {
  // knows more about abstraction then the query layer
  // will be moved in the core services not the db
  // D&P should wrap some d&p logic
  // i18N should wrapp some i18n logic etc etc
};

class Database {
  constructor(config) {
    this.metadata = createMetadata(config.models);

    // validate models are valid
    // this.metadata.validate();

    // this.connector = resolveConnector(this.config);

    this.connection = knex(config.connection);

    // build some information to make queries & schema generation easier (relations / components / dz / media / primary key ...)

    // build schema
    // load form memory
    // sync schema
    this.schema = createSchemaProvider(this);

    // migrations -> allow running them through cli before startup

    this.em = createEntityManager(this);
  }

  query(uid) {
    return this.em.getRepository(uid);
  }
}

module.exports = {
  Database,
};

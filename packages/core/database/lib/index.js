'use strict';

const util = require('util');

const Configuration = require('./configuration');
const { resolveConnector } = require('./connector');

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


{
  schema: public,
  tables: [

    {
      name: 'articles',
      columns: [
        {
          name: 'xxx',
          type: 'xxx',
          args: ['xxx', 'xxx', 'xxx'],
        },
        {

        }
      ],
      indexes: [
        {
          columns: [],
          name: 'xx',
          type: 'unique',
        }
      ],
      foreignKeys: [
        {
          name: 'xxx',
          column: 'xxx',
          references: 'xxx',
          table: 'xxx',
          onUpdate: 'xx',
          onDelete: 'xx',
        }
      ],
      primaryKeys: [],
    }
  ],
}

Scenarios for migrations

- user edit a CT in the Admin -> should we update the DB in place ? or dump a migration file ?
-

*/

class Database {
  constructor(config) {
    this.config = Configuration.from(config);

    console.log(util.inspect(this.config, null, null, true));

    this.connector = resolveConnector(this.config);
  }
}

module.exports = {
  Database,
};

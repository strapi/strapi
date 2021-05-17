'use strict';
const knex = require('knex');

const mappings = {};

const createSchema = ({ models, connection }) => {
  const tables = [];

  models.forEach(model => {
    tables.push({
      name: model.collectionName,
      columns: [
        {
          name: 'id',
          type: 'increments',
          args: [],
        },
      ],
    });
  });

  return {
    async create() {
      console.log('creating schema');

      const knex = connection.getKnex();

      // start transaction

      for (const table of tables) {
        const query = knex.schema.createTable(table.name, t => {
          table.columns.forEach(column => {
            t[column.type](column.name, ...column.args);
          });
        });

        console.log(query.toSQL());

        await query;
      }
    },
  };
};

class Connection {
  constructor(config) {
    console.log(config);
    this.knex = knex(config);
  }

  getKnex() {
    return this.knex;
  }
}

class SqlConnector {
  constructor(config) {
    this.config = config;

    this.connection = new Connection(config.get('connection'));
  }

  getSchema() {
    return createSchema({ models: this.config.get('models'), connection: this.connection });
  }
}

module.exports = SqlConnector;

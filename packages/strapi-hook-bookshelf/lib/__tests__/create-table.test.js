const knex = require('knex');
const createTable = require('../create-table');

let con;

describe('Create Table', () => {
  beforeAll(() => {
    con = knex({
      client: 'sqlite',
      connection: {
        filename: './test.sqlite',
      },
      useNullAsDefault: true,
    });
  });

  test('That works', () => {
    return createTable(
      {
        collectionName: 'something',
        attributes: {
          id: {
            type: 'specificType',
            specificType: 'serial primary key',
          },
          title: {
            type: 'string',
            required: true, // not nullable
            unique: true, // or [args]
            default: 'hello',
          },
        },
      },
      { knex: con, client: 'pg' }
    );
  });
});

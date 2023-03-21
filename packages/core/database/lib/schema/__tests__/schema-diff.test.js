'use strict';

const createSchemaDiff = require('../diff');

let diffSchemas;
describe('diffSchemas', () => {
  beforeEach(() => {
    const schemaDiff = createSchemaDiff({
      dialect: {
        usesForeignKeys() {
          return true;
        },
      },
    });

    diffSchemas = schemaDiff.diff.bind(schemaDiff);

    global.strapi = {
      store: {
        get: () => [],
      },
    };
  });

  test('New Table', async () => {
    const testTable = {
      name: 'my_table',
    };

    const srcSchema = {
      tables: [],
    };

    const destSchema = {
      tables: [testTable],
    };

    expect(await diffSchemas(srcSchema, destSchema)).toStrictEqual({
      status: 'CHANGED',
      diff: {
        tables: {
          added: [testTable],
          updated: [],
          unchanged: [],
          removed: [],
        },
      },
    });
  });

  test('Removed Table', async () => {
    const testTable = {
      name: 'my_table',
    };

    const srcSchema = {
      tables: [testTable],
    };

    const destSchema = {
      tables: [],
    };

    expect(await diffSchemas(srcSchema, destSchema)).toStrictEqual({
      status: 'CHANGED',
      diff: {
        tables: {
          added: [],
          updated: [],
          unchanged: [],
          removed: [testTable],
        },
      },
    });
  });

  test('Unchanged Table', async () => {
    const testTable = {
      name: 'my_table',
      columns: [],
      indexes: [],
      foreignKeys: [],
    };

    const srcSchema = {
      tables: [testTable],
    };

    const destSchema = {
      tables: [testTable],
    };

    expect(await diffSchemas(srcSchema, destSchema)).toStrictEqual({
      status: 'UNCHANGED',
      diff: {
        tables: {
          added: [],
          updated: [],
          unchanged: [testTable],
          removed: [],
        },
      },
    });
  });

  describe('Changed table', () => {
    test('added column', async () => {
      const srcSchema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [],
            foreignKeys: [],
          },
        ],
      };

      const destSchema = {
        tables: [
          {
            name: 'my_table',
            indexes: [],
            foreignKeys: [],
            columns: [
              {
                name: 'test_column',
              },
            ],
          },
        ],
      };

      expect(await diffSchemas(srcSchema, destSchema)).toStrictEqual({
        status: 'CHANGED',
        diff: {
          tables: {
            added: [],
            updated: [
              {
                name: 'my_table',
                columns: {
                  added: [
                    {
                      name: 'test_column',
                    },
                  ],
                  updated: [],
                  unchanged: [],
                  removed: [],
                },
                foreignKeys: {
                  added: [],
                  updated: [],
                  unchanged: [],
                  removed: [],
                },
                indexes: {
                  added: [],
                  updated: [],
                  unchanged: [],
                  removed: [],
                },
              },
            ],
            unchanged: [],
            removed: [],
          },
        },
      });
    });

    test.todo('updated column');
    test.todo('unchanged column');
    test.todo('removed column');

    test.todo('added index');
    test.todo('updated index');
    test.todo('unchanged index');
    test.todo('removed index');

    test.todo('added foreign key');
    test.todo('updated foreign key');
    test.todo('unchanged foreign key');
    test.todo('removed foreign key');
  });

  test('With persisted DB tables', async () => {
    const testTables = [
      {
        name: 'my_table',
      },
      {
        name: 'my_table_1',
      },
    ];

    const coreStoreTable = {
      name: 'strapi_core_store_settings',
      columns: [],
      indexes: [],
      foreignKeys: [],
    };

    global.strapi = {
      store: {
        get: async () => [testTables[0].name, 'table2'],
      },
    };

    const srcSchema = {
      tables: [...testTables, coreStoreTable],
    };

    const destSchema = {
      tables: [coreStoreTable],
    };

    expect(await diffSchemas(srcSchema, destSchema)).toStrictEqual({
      status: 'CHANGED',
      diff: {
        tables: {
          added: [],
          updated: [],
          unchanged: [coreStoreTable],
          removed: [testTables[1]],
        },
      },
    });
  });
});

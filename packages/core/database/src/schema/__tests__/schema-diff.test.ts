/* eslint-disable @typescript-eslint/no-namespace */
import createSchemaDiff from '../diff';
import type { Schema, Table } from '..';

describe('diffSchemas', () => {
  let diffSchemas: ReturnType<typeof createSchemaDiff>['diff'];

  beforeEach(() => {
    const schemaDiff = createSchemaDiff({
      dialect: {
        usesForeignKeys() {
          return true;
        },
      },
    } as any);

    diffSchemas = schemaDiff.diff.bind(schemaDiff);

    global.strapi = {
      store: {
        get: () => [],
      },
    };
  });

  test('New Table', async () => {
    const testTable: Table = {
      name: 'my_table',
      columns: [],
      indexes: [],
      foreignKeys: [],
    };

    const srcSchema: Schema = {
      tables: [],
    };

    const destSchema: Schema = {
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
    const testTable: Table = {
      name: 'my_table',
      columns: [],
      indexes: [],
      foreignKeys: [],
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
      const srcSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [],
            foreignKeys: [],
          },
        ],
      };

      const destSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            indexes: [],
            foreignKeys: [],
            columns: [
              {
                name: 'test_column',
                type: 'text',
                notNullable: true,
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
                      type: 'text',
                      notNullable: true,
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
        columns: [],
        indexes: [],
        foreignKeys: [],
      },
      {
        name: 'my_table_1',
        columns: [],
        indexes: [],
        foreignKeys: [],
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
    } as any;

    const srcSchema: Schema = {
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

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

    const databaseSchema: Schema = {
      tables: [],
    };

    const userSchema: Schema = {
      tables: [testTable],
    };

    expect(
      await diffSchemas({ databaseSchema, userSchema, previousSchema: userSchema })
    ).toStrictEqual({
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

    const databaseSchema = {
      tables: [testTable],
    };

    const userSchema = {
      tables: [],
    };

    const previousSchema = {
      tables: [testTable],
    };

    expect(await diffSchemas({ databaseSchema, userSchema, previousSchema })).toStrictEqual({
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

    const databaseSchema = {
      tables: [testTable],
    };

    const userSchema = {
      tables: [testTable],
    };

    expect(
      await diffSchemas({ databaseSchema, userSchema, previousSchema: userSchema })
    ).toStrictEqual({
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

  test('UnTracked Table', async () => {
    const testTable = {
      name: 'my_table',
      columns: [],
      indexes: [],
      foreignKeys: [],
    };

    const databaseSchema = {
      tables: [testTable],
    };

    const userSchema = {
      tables: [],
    };

    const previousSchema = {
      tables: [],
    };

    expect(await diffSchemas({ databaseSchema, userSchema, previousSchema })).toStrictEqual({
      status: 'UNCHANGED',
      diff: {
        tables: {
          added: [],
          updated: [],
          unchanged: [],
          removed: [],
        },
      },
    });
  });

  describe('Changed table', () => {
    test('added column', async () => {
      const databaseSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [],
            foreignKeys: [],
          },
        ],
      };

      const userSchema: Schema = {
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

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: userSchema })
      ).toStrictEqual({
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

    const databaseSchema: Schema = {
      tables: [...testTables, coreStoreTable],
    };

    const userSchema = {
      tables: [coreStoreTable],
    };

    const previousSchema = {
      tables: [coreStoreTable, testTables[1]],
    };

    expect(await diffSchemas({ databaseSchema, userSchema, previousSchema })).toStrictEqual({
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

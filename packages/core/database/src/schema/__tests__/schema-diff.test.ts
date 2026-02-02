/* eslint-disable @typescript-eslint/no-namespace */
import createSchemaDiff from '../diff';
import type { Index, Schema, Table } from '..';

describe('diffSchemas', () => {
  let diffSchemas: ReturnType<typeof createSchemaDiff>['diff'];

  beforeEach(() => {
    const schemaDiff = createSchemaDiff({
      dialect: {
        usesForeignKeys() {
          return true;
        },
        getSqlType: (type: string) => type, // Mock the getSqlType function to return the type as-is
        supportsUnsigned: () => false,
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

  test('Table order ignored', async () => {
    const databaseSchema: Schema = {
      tables: [
        {
          name: 'table_a',
          columns: [],
          indexes: [],
          foreignKeys: [],
        },
        {
          name: 'table_b',
          columns: [],
          indexes: [],
          foreignKeys: [],
        },
      ],
    };

    const userSchema: Schema = {
      tables: [
        {
          name: 'table_b',
          columns: [],
          indexes: [],
          foreignKeys: [],
        },
        {
          name: 'table_a',
          columns: [],
          indexes: [],
          foreignKeys: [],
        },
      ],
    };

    const result = await diffSchemas({ databaseSchema, userSchema, previousSchema: userSchema });

    expect(result.status).toBe('UNCHANGED');
    expect(result.diff.tables.added).toHaveLength(0);
    expect(result.diff.tables.updated).toHaveLength(0);
    expect(result.diff.tables.removed).toHaveLength(0);
    expect(result.diff.tables.unchanged).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'table_a' }),
        expect.objectContaining({ name: 'table_b' }),
      ])
    );
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

    test('Column order ignored', async () => {
      const databaseSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [
              { name: 'locale', type: 'text', notNullable: true },
              { name: 'documentId', type: 'integer', notNullable: true },
            ],
            indexes: [],
            foreignKeys: [],
          },
        ],
      };

      const userSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [
              { name: 'documentId', type: 'integer', notNullable: true },
              { name: 'locale', type: 'text', notNullable: true },
            ],
            indexes: [],
            foreignKeys: [],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: userSchema })
      ).toStrictEqual({
        status: 'UNCHANGED',
        diff: {
          tables: {
            added: [],
            updated: [],
            unchanged: [
              {
                name: 'my_table',
                columns: [
                  { name: 'locale', type: 'text', notNullable: true },
                  { name: 'documentId', type: 'integer', notNullable: true },
                ],
                indexes: [],
                foreignKeys: [],
              },
            ],
            removed: [],
          },
        },
      });
    });

    test('unchanged column', async () => {
      const testColumn = {
        name: 'test_column',
        type: 'text',
        notNullable: true,
      };

      const databaseSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            indexes: [],
            foreignKeys: [],
            columns: [testColumn],
          },
        ],
      };

      const userSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            indexes: [],
            foreignKeys: [],
            columns: [testColumn],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: databaseSchema })
      ).toStrictEqual({
        status: 'UNCHANGED',
        diff: {
          tables: {
            added: [],
            updated: [],
            unchanged: [
              {
                name: 'my_table',
                columns: [testColumn],
                indexes: [],
                foreignKeys: [],
              },
            ],
            removed: [],
          },
        },
      });
    });

    test('removed column', async () => {
      const testColumn = {
        name: 'test_column',
        type: 'text',
        notNullable: true,
      };

      const databaseSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            indexes: [],
            foreignKeys: [],
            columns: [testColumn],
          },
        ],
      };

      const userSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            indexes: [],
            foreignKeys: [],
            columns: [],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: databaseSchema })
      ).toStrictEqual({
        status: 'CHANGED',
        diff: {
          tables: {
            added: [],
            updated: [
              {
                name: 'my_table',
                columns: {
                  added: [],
                  updated: [],
                  unchanged: [],
                  removed: [testColumn],
                },
                indexes: {
                  added: [],
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
              },
            ],
            unchanged: [],
            removed: [],
          },
        },
      });
    });

    test('added index', async () => {
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
            columns: [],
            foreignKeys: [],
            indexes: [
              {
                name: 'test_index',
                columns: ['column1'],
                type: 'unique',
              },
            ],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: databaseSchema })
      ).toStrictEqual({
        status: 'CHANGED',
        diff: {
          tables: {
            added: [],
            updated: [
              {
                name: 'my_table',
                columns: {
                  added: [],
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
                  added: [
                    {
                      name: 'test_index',
                      columns: ['column1'],
                      type: 'unique',
                    },
                  ],
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

    test('updated index', async () => {
      const databaseSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            foreignKeys: [],
            indexes: [
              {
                name: 'test_index',
                columns: ['column1'],
                type: 'unique',
              },
            ],
          },
        ],
      };

      const userSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            foreignKeys: [],
            indexes: [
              {
                name: 'test_index',
                columns: ['column1', 'column2'], // Updated to include a second column
                type: 'unique',
              },
            ],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: databaseSchema })
      ).toStrictEqual({
        status: 'CHANGED',
        diff: {
          tables: {
            added: [],
            updated: [
              {
                name: 'my_table',
                columns: {
                  added: [],
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
                  updated: [
                    {
                      name: 'test_index',
                      object: {
                        name: 'test_index',
                        columns: ['column1', 'column2'],
                        type: 'unique',
                      },
                    },
                  ],
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

    test('Index order ignored', async () => {
      const databaseSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [
              { name: 'index_1', columns: ['column1'], type: 'unique' },
              { name: 'index_2', columns: ['column2'], type: 'unique' },
            ],
            foreignKeys: [],
          },
        ],
      };

      const userSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [
              { name: 'index_2', columns: ['column2'], type: 'unique' },
              { name: 'index_1', columns: ['column1'], type: 'unique' },
            ],
            foreignKeys: [],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: userSchema })
      ).toStrictEqual({
        status: 'UNCHANGED',
        diff: {
          tables: {
            added: [],
            updated: [],
            unchanged: [
              {
                name: 'my_table',
                columns: [],
                indexes: [
                  { name: 'index_1', columns: ['column1'], type: 'unique' },
                  { name: 'index_2', columns: ['column2'], type: 'unique' },
                ],
                foreignKeys: [],
              },
            ],
            removed: [],
          },
        },
      });
    });

    test('unchanged index', async () => {
      const testIndex: Index = {
        name: 'test_index',
        columns: ['column1'],
        type: 'unique',
      };

      const databaseSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            foreignKeys: [],
            indexes: [testIndex],
          },
        ],
      };

      const userSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            foreignKeys: [],
            indexes: [testIndex],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: databaseSchema })
      ).toStrictEqual({
        status: 'UNCHANGED',
        diff: {
          tables: {
            added: [],
            updated: [],
            unchanged: [
              {
                name: 'my_table',
                columns: [],
                foreignKeys: [],
                indexes: [testIndex],
              },
            ],
            removed: [],
          },
        },
      });
    });

    test('removed index', async () => {
      const testIndex: Index = {
        name: 'test_index',
        columns: ['column1'],
        type: 'unique',
      };

      const databaseSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            foreignKeys: [],
            indexes: [testIndex],
          },
        ],
      };

      const userSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            foreignKeys: [],
            indexes: [],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: databaseSchema })
      ).toStrictEqual({
        status: 'CHANGED',
        diff: {
          tables: {
            added: [],
            updated: [
              {
                name: 'my_table',
                columns: {
                  added: [],
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
                  removed: [testIndex],
                },
              },
            ],
            unchanged: [],
            removed: [],
          },
        },
      });
    });

    test('added foreign key', async () => {
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
            columns: [],
            indexes: [],
            foreignKeys: [
              {
                name: 'fk_test',
                columns: ['column1'],
                referencedTable: 'another_table',
                referencedColumns: ['id'],
                onDelete: 'CASCADE',
                onUpdate: 'RESTRICT',
              },
            ],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: databaseSchema })
      ).toStrictEqual({
        status: 'CHANGED',
        diff: {
          tables: {
            added: [],
            updated: [
              {
                name: 'my_table',
                columns: {
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
                foreignKeys: {
                  added: [
                    {
                      name: 'fk_test',
                      columns: ['column1'],
                      referencedTable: 'another_table',
                      referencedColumns: ['id'],
                      onDelete: 'CASCADE',
                      onUpdate: 'RESTRICT',
                    },
                  ],
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

    test('updated foreign key', async () => {
      const databaseSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [],
            foreignKeys: [
              {
                name: 'fk_test',
                columns: ['column1'],
                referencedTable: 'another_table',
                referencedColumns: ['id'],
                onDelete: 'CASCADE',
                onUpdate: 'RESTRICT',
              },
            ],
          },
        ],
      };

      const userSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [],
            foreignKeys: [
              {
                name: 'fk_test',
                columns: ['column1'],
                referencedTable: 'another_table',
                referencedColumns: ['id'],
                onDelete: 'RESTRICT', // Updated from CASCADE to RESTRICT
                onUpdate: 'CASCADE', // Updated from RESTRICT to CASCADE
              },
            ],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: databaseSchema })
      ).toStrictEqual({
        status: 'CHANGED',
        diff: {
          tables: {
            added: [],
            updated: [
              {
                name: 'my_table',
                columns: {
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
                foreignKeys: {
                  added: [],
                  updated: [
                    {
                      name: 'fk_test',
                      object: {
                        name: 'fk_test',
                        columns: ['column1'],
                        referencedTable: 'another_table',
                        referencedColumns: ['id'],
                        onDelete: 'RESTRICT',
                        onUpdate: 'CASCADE',
                      },
                    },
                  ],
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

    test('Foreign key order ignored', async () => {
      const databaseSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [],
            foreignKeys: [
              {
                name: 'fk_test_1',
                columns: ['column1'],
                referencedTable: 'another_table',
                referencedColumns: ['id'],
                onDelete: 'CASCADE',
                onUpdate: 'RESTRICT',
              },
              {
                name: 'fk_test_2',
                columns: ['column2'],
                referencedTable: 'another_table',
                referencedColumns: ['id'],
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
              },
            ],
          },
        ],
      };

      const userSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [],
            foreignKeys: [
              {
                name: 'fk_test_2',
                columns: ['column2'],
                referencedTable: 'another_table',
                referencedColumns: ['id'],
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
              },
              {
                name: 'fk_test_1',
                columns: ['column1'],
                referencedTable: 'another_table',
                referencedColumns: ['id'],
                onDelete: 'CASCADE',
                onUpdate: 'RESTRICT',
              },
            ],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: userSchema })
      ).toStrictEqual({
        status: 'UNCHANGED',
        diff: {
          tables: {
            added: [],
            updated: [],
            unchanged: [
              {
                name: 'my_table',
                columns: [],
                indexes: [],
                foreignKeys: [
                  {
                    name: 'fk_test_1',
                    columns: ['column1'],
                    referencedTable: 'another_table',
                    referencedColumns: ['id'],
                    onDelete: 'CASCADE',
                    onUpdate: 'RESTRICT',
                  },
                  {
                    name: 'fk_test_2',
                    columns: ['column2'],
                    referencedTable: 'another_table',
                    referencedColumns: ['id'],
                    onDelete: 'RESTRICT',
                    onUpdate: 'CASCADE',
                  },
                ],
              },
            ],
            removed: [],
          },
        },
      });
    });

    test('unchanged foreign key', async () => {
      const testForeignKey = {
        name: 'fk_test',
        columns: ['column1'],
        referencedTable: 'another_table',
        referencedColumns: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'RESTRICT',
      };

      const databaseSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [],
            foreignKeys: [testForeignKey],
          },
        ],
      };

      const userSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [],
            foreignKeys: [testForeignKey],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: databaseSchema })
      ).toStrictEqual({
        status: 'UNCHANGED',
        diff: {
          tables: {
            added: [],
            updated: [],
            unchanged: [
              {
                name: 'my_table',
                columns: [],
                indexes: [],
                foreignKeys: [testForeignKey],
              },
            ],
            removed: [],
          },
        },
      });
    });

    test('removed foreign key', async () => {
      const testForeignKey = {
        name: 'fk_test',
        columns: ['column1'],
        referencedTable: 'another_table',
        referencedColumns: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'RESTRICT',
      };

      const databaseSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [],
            foreignKeys: [testForeignKey],
          },
        ],
      };

      const userSchema: Schema = {
        tables: [
          {
            name: 'my_table',
            columns: [],
            indexes: [],
            foreignKeys: [],
          },
        ],
      };

      expect(
        await diffSchemas({ databaseSchema, userSchema, previousSchema: databaseSchema })
      ).toStrictEqual({
        status: 'CHANGED',
        diff: {
          tables: {
            added: [],
            updated: [
              {
                name: 'my_table',
                columns: {
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
                foreignKeys: {
                  added: [],
                  updated: [],
                  unchanged: [],
                  removed: [testForeignKey],
                },
              },
            ],
            unchanged: [],
            removed: [],
          },
        },
      });
    });
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

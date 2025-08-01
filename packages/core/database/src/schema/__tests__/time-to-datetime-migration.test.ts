import createBuilder from '../builder';

describe('PostgreSQL Date Time Type Conversions in Schema Builder', () => {
  let db: any;
  let builder: ReturnType<typeof createBuilder>;
  let rawCalls: any[] = [];

  beforeEach(() => {
    rawCalls = [];

    // Minimal mock for the database
    db = {
      config: {
        connection: {
          client: 'postgres',
        },
      },
      getSchemaName: jest.fn().mockReturnValue(null),
      getSchemaConnection: jest.fn().mockReturnValue({
        alterTable: jest.fn().mockImplementation(async (_tableName, callback) => {
          const mockCol = {
            alter: jest.fn(),
            nullable: jest.fn(),
            notNullable: jest.fn(),
            defaultTo: jest.fn(),
            unsigned: jest.fn(),
          };
          const tableBuilder = {
            datetime: jest.fn().mockReturnValue(mockCol),
            time: jest.fn().mockReturnValue(mockCol),
          };
          await callback(tableBuilder);
        }),
      }),
      connection: {
        raw: jest.fn().mockImplementation((...args) => {
          rawCalls.push(args);
          return Promise.resolve({});
        }),
        transaction: jest.fn().mockImplementation(async (callback) => {
          await callback({});
        }),
      },
      dialect: {
        startSchemaUpdate: jest.fn(),
        endSchemaUpdate: jest.fn(),
        schemaInspector: {
          getIndexes: jest.fn().mockResolvedValue([]),
          getForeignKeys: jest.fn().mockResolvedValue([]),
        },
      },
    };

    builder = createBuilder(db);
  });

  it('should handle time to datetime conversion with proper USING clause', async () => {
    // Mock information_schema response for time column
    db.connection.raw.mockImplementation((query: string, params: any[]) => {
      rawCalls.push([query, params]);
      if (query.includes('information_schema')) {
        return Promise.resolve({
          rows: [{ data_type: 'time without time zone' }],
        });
      }
      return Promise.resolve({});
    });

    const schemaDiff = {
      tables: {
        added: [],
        removed: [],
        updated: [
          {
            name: 'my_times',
            columns: {
              added: [],
              removed: [],
              updated: [
                {
                  name: 'hour',
                  object: { name: 'hour', type: 'datetime', notNullable: false },
                },
              ],
              unchanged: [],
            },
            indexes: { added: [], removed: [], updated: [], unchanged: [] },
            foreignKeys: { added: [], removed: [], updated: [], unchanged: [] },
          },
        ],
        unchanged: [],
      },
    };

    await builder.updateSchema(schemaDiff);

    // Verify the custom ALTER statement was called
    const alterCall = rawCalls.find(
      (call) =>
        call[0].includes('ALTER TABLE') &&
        call[0].includes('TYPE timestamp(6)') &&
        call[0].includes('USING')
    );

    expect(alterCall).toBeDefined();
    expect(alterCall[1]).toEqual(['my_times', 'hour', 'hour']);

    // Verify information_schema was queried
    const schemaQuery = rawCalls.find((call) => call[0].includes('information_schema'));
    expect(schemaQuery).toBeDefined();
    expect(schemaQuery[1]).toEqual(['my_times', 'hour']);
  });

  it('should handle datetime to time conversion with proper USING clause', async () => {
    // Mock information_schema response for timestamp column
    db.connection.raw.mockImplementation((query: string, params: any[]) => {
      rawCalls.push([query, params]);
      if (query.includes('information_schema')) {
        return Promise.resolve({
          rows: [{ data_type: 'timestamp without time zone' }],
        });
      }
      return Promise.resolve({});
    });

    const schemaDiff = {
      tables: {
        added: [],
        removed: [],
        updated: [
          {
            name: 'my_times',
            columns: {
              added: [],
              removed: [],
              updated: [
                {
                  name: 'timestamp_field',
                  object: { name: 'timestamp_field', type: 'time', notNullable: false },
                },
              ],
              unchanged: [],
            },
            indexes: { added: [], removed: [], updated: [], unchanged: [] },
            foreignKeys: { added: [], removed: [], updated: [], unchanged: [] },
          },
        ],
        unchanged: [],
      },
    };

    await builder.updateSchema(schemaDiff);

    // Verify the custom ALTER statement was called for datetime to time
    const alterCall = rawCalls.find(
      (call) =>
        call[0].includes('ALTER TABLE') &&
        call[0].includes('TYPE time(3)') &&
        call[0].includes('USING')
    );

    expect(alterCall).toBeDefined();
    expect(alterCall[1]).toEqual(['my_times', 'timestamp_field', 'timestamp_field']);
  });

  it('should not apply special handling for non-PostgreSQL databases', async () => {
    // Change to MySQL
    db.config.connection.client = 'mysql';

    const schemaDiff = {
      tables: {
        added: [],
        removed: [],
        updated: [
          {
            name: 'my_times',
            columns: {
              added: [],
              removed: [],
              updated: [
                {
                  name: 'hour',
                  object: { name: 'hour', type: 'datetime', notNullable: false },
                },
              ],
              unchanged: [],
            },
            indexes: { added: [], removed: [], updated: [], unchanged: [] },
            foreignKeys: { added: [], removed: [], updated: [], unchanged: [] },
          },
        ],
        unchanged: [],
      },
    };

    await builder.updateSchema(schemaDiff);

    // Should not query information_schema for MySQL
    const schemaQuery = rawCalls.find(
      (call) => call[0] && call[0].includes && call[0].includes('information_schema')
    );
    expect(schemaQuery).toBeUndefined();
  });

  it('should handle columns with notNullable and defaultTo properties', async () => {
    // Mock information_schema response
    db.connection.raw.mockImplementation((query: string, params: any[]) => {
      rawCalls.push([query, params]);
      if (query.includes('information_schema')) {
        return Promise.resolve({
          rows: [{ data_type: 'time without time zone' }],
        });
      }
      return Promise.resolve({});
    });

    const schemaDiff = {
      tables: {
        added: [],
        removed: [],
        updated: [
          {
            name: 'my_times',
            columns: {
              added: [],
              removed: [],
              updated: [
                {
                  name: 'hour',
                  object: {
                    name: 'hour',
                    type: 'datetime',
                    notNullable: true,
                    defaultTo: '2024-01-01 00:00:00',
                  },
                },
              ],
              unchanged: [],
            },
            indexes: { added: [], removed: [], updated: [], unchanged: [] },
            foreignKeys: { added: [], removed: [], updated: [], unchanged: [] },
          },
        ],
        unchanged: [],
      },
    };

    await builder.updateSchema(schemaDiff);

    // Verify SET NOT NULL was called
    const notNullCall = rawCalls.find((call) => call[0].includes('SET NOT NULL'));
    expect(notNullCall).toBeDefined();
    expect(notNullCall[1]).toEqual(['my_times', 'hour']);

    // Verify SET DEFAULT was called
    const defaultCall = rawCalls.find((call) => call[0].includes('SET DEFAULT'));
    expect(defaultCall).toBeDefined();
    expect(defaultCall[1]).toEqual(['my_times', 'hour', '2024-01-01 00:00:00']);
  });
});

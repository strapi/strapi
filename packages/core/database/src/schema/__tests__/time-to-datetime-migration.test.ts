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
      logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
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
          const mockTrx = {
            raw: jest.fn().mockImplementation((...args) => {
              rawCalls.push(args);
              return Promise.resolve({});
            }),
            withSchema: jest.fn().mockReturnThis(),
          };
          await callback(mockTrx);
        }),
      },
      dialect: {
        startSchemaUpdate: jest.fn(),
        endSchemaUpdate: jest.fn(),
        schemaInspector: {
          getIndexes: jest.fn().mockResolvedValue([]),
          getForeignKeys: jest.fn().mockResolvedValue([]),
        },
        getColumnTypeConversionSQL: jest.fn().mockImplementation((currentType, targetType) => {
          // PostgreSQL conversions
          if (targetType === 'datetime' && currentType === 'time without time zone') {
            return {
              sql: `ALTER TABLE ?? ALTER COLUMN ?? TYPE timestamp(6) USING ('1970-01-01 ' || ??::text)::timestamp`,
              typeClause: 'timestamp(6)',
              warning:
                'Time values will be converted to datetime with default date "1970-01-01". Original time values will be preserved.',
            };
          }
          if (targetType === 'time' && currentType === 'timestamp without time zone') {
            return {
              sql: `ALTER TABLE ?? ALTER COLUMN ?? TYPE time(3) USING ??::time`,
              typeClause: 'time(3)',
              warning:
                'Datetime values will be converted to time only. Date information will be lost.',
            };
          }
          return null;
        }),
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

    // Verify warning was logged with the new concise format
    expect(db.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Database type conversion: "my_times.hour" from "time without time zone" to "datetime". Time values will be converted to datetime with default date "1970-01-01". Original time values will be preserved.'
      )
    );
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

    // Verify warning was logged with the new concise format
    expect(db.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Database type conversion: "my_times.timestamp_field" from "timestamp without time zone" to "time". Datetime values will be converted to time only. Date information will be lost.'
      )
    );
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

    // Verify SET DEFAULT was called with properly escaped value
    const defaultCall = rawCalls.find((call) => call[0].includes('SET DEFAULT'));
    expect(defaultCall).toBeDefined();
    expect(defaultCall[0]).toContain("SET DEFAULT '2024-01-01 00:00:00'");
    expect(defaultCall[1]).toEqual(['my_times', 'hour']);

    // Verify warning was logged with the new concise format
    expect(db.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Database type conversion: "my_times.hour" from "time without time zone" to "datetime". Time values will be converted to datetime with default date "1970-01-01". Original time values will be preserved.'
      )
    );
  });
});

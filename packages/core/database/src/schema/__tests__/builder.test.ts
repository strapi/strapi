import createSchemaBuilder from '../builder';

describe('schema builder', () => {
  it('drops PostgreSQL foreign keys before tables without using CASCADE', async () => {
    const raw = jest.fn().mockResolvedValue(undefined);
    const dropTableIfExists = jest.fn().mockResolvedValue(undefined);
    const schemaBuilder = {
      client: { raw },
      dropTableIfExists,
    };
    const db = {
      config: { settings: { forceMigration: true } },
      connection: {
        transaction: jest.fn(async (handler) => handler({})),
      },
      dialect: { client: 'postgres' },
      getSchemaConnection: jest.fn(() => schemaBuilder),
      getSchemaName: jest.fn(() => undefined),
    };
    const schema = {
      tables: [
        {
          name: 'articles',
          foreignKeys: [{ name: 'articles_author_id_fk', columns: ['author_id'] }],
        },
      ],
    };

    await createSchemaBuilder(db as any).dropSchema(schema as any);

    expect(raw).toHaveBeenCalledWith('ALTER TABLE ?? DROP CONSTRAINT IF EXISTS ??', [
      'articles',
      'articles_author_id_fk',
    ]);
    expect(dropTableIfExists).toHaveBeenCalledWith('articles');
    expect(raw.mock.calls.flat()).not.toContainEqual(
      expect.stringMatching(/DROP TABLE .* CASCADE/i)
    );
  });

  it('drops a surviving table foreign key before it drops a removed table', async () => {
    const order: string[] = [];
    const raw = jest.fn(async (sql: string) => {
      order.push(sql);
    });
    const dropTableIfExists = jest.fn(async (name: string) => {
      order.push(`drop:${name}`);
    });
    const schemaBuilder = {
      client: { raw },
      dropTableIfExists,
      alterTable: jest.fn(async () => undefined),
    };
    const db = {
      config: {
        settings: { forceMigration: true },
        connection: { client: 'postgres' },
      },
      connection: {
        transaction: jest.fn(async (handler) => handler({})),
      },
      dialect: {
        client: 'postgres',
        startSchemaUpdate: jest.fn(),
        endSchemaUpdate: jest.fn(),
        schemaInspector: {
          getIndexes: jest.fn(async () => []),
          getForeignKeys: jest.fn(async () => []),
        },
      },
      getSchemaConnection: jest.fn(() => schemaBuilder),
      getSchemaName: jest.fn(() => undefined),
    };
    const schemaDiff = {
      tables: {
        added: [],
        removed: [{ name: 'old_articles', foreignKeys: [] }],
        updated: [
          {
            name: 'articles',
            columns: { added: [], removed: [], updated: [], unchanged: [] },
            indexes: { added: [], removed: [], updated: [], unchanged: [] },
            foreignKeys: {
              added: [],
              removed: [{ name: 'articles_author_id_fk', columns: ['author_id'] }],
              updated: [],
              unchanged: [],
            },
          },
        ],
        unchanged: [],
      },
    };

    await createSchemaBuilder(db as any).updateSchema(schemaDiff as any);

    const constraint = order.indexOf('ALTER TABLE ?? DROP CONSTRAINT IF EXISTS ??');
    const drop = order.indexOf('drop:old_articles');
    expect(constraint).toBeGreaterThanOrEqual(0);
    expect(drop).toBeGreaterThan(constraint);
    expect(raw).toHaveBeenCalledWith('ALTER TABLE ?? DROP CONSTRAINT IF EXISTS ??', [
      'articles',
      'articles_author_id_fk',
    ]);
    expect(order.join('\n')).not.toMatch(/CASCADE/i);
  });

  it('drops updated foreign keys and skips tables that have none blocking a drop', async () => {
    const raw = jest.fn().mockResolvedValue(undefined);
    const schemaBuilder = {
      client: { raw },
      dropTableIfExists: jest.fn().mockResolvedValue(undefined),
      alterTable: jest.fn(async () => undefined),
    };
    const db = {
      config: {
        settings: { forceMigration: true },
        connection: { client: 'postgres' },
      },
      connection: {
        transaction: jest.fn(async (handler) => handler({})),
      },
      dialect: {
        client: 'postgres',
        startSchemaUpdate: jest.fn(),
        endSchemaUpdate: jest.fn(),
        schemaInspector: {
          getIndexes: jest.fn(async () => []),
          getForeignKeys: jest.fn(async () => [null, { name: 'articles_author_id_fk' }]),
        },
      },
      getSchemaConnection: jest.fn(() => schemaBuilder),
      getSchemaName: jest.fn(() => undefined),
    };
    const emptyForeignKeys = { added: [], removed: [], updated: [], unchanged: [] };
    const schemaDiff = {
      tables: {
        added: [],
        removed: [{ name: 'old_articles', foreignKeys: [] }],
        updated: [
          {
            name: 'articles',
            columns: { added: [], removed: [], updated: [], unchanged: [] },
            indexes: { added: [], removed: [], updated: [], unchanged: [] },
            foreignKeys: {
              added: [],
              removed: [{ name: 'articles_author_id_fk', columns: ['author_id'] }],
              updated: [
                {
                  object: { name: 'articles_category_id_fk', columns: ['category_id'] },
                },
              ],
              unchanged: [],
            },
          },
          {
            name: 'categories',
            columns: { added: [], removed: [], updated: [], unchanged: [] },
            indexes: { added: [], removed: [], updated: [], unchanged: [] },
            foreignKeys: emptyForeignKeys,
          },
        ],
        unchanged: [],
      },
    };

    await createSchemaBuilder(db as any).updateSchema(schemaDiff as any);

    expect(raw).toHaveBeenCalledWith('ALTER TABLE ?? DROP CONSTRAINT IF EXISTS ??', [
      'articles',
      'articles_category_id_fk',
    ]);
    expect(raw).toHaveBeenCalledWith('ALTER TABLE ?? DROP CONSTRAINT IF EXISTS ??', [
      'articles',
      'articles_author_id_fk',
    ]);
    expect(raw).not.toHaveBeenCalledWith('ALTER TABLE ?? DROP CONSTRAINT IF EXISTS ??', [
      'categories',
      expect.anything(),
    ]);
  });

  it('qualifies postgres identifiers and ignores tables that have no foreign keys', async () => {
    const raw = jest.fn().mockResolvedValue(undefined);
    const schemaBuilder = {
      client: { raw },
      dropTableIfExists: jest.fn().mockResolvedValue(undefined),
    };
    const db = {
      config: { settings: { forceMigration: true } },
      connection: {
        transaction: jest.fn(async (handler) => handler({})),
      },
      dialect: { client: 'postgres' },
      getSchemaConnection: jest.fn(() => schemaBuilder),
      getSchemaName: jest.fn(() => 'public'),
    };
    const schema = {
      tables: [
        {
          name: 'articles',
          foreignKeys: [{ name: 'articles_author_id_fk', columns: ['author_id'] }],
        },
        { name: 'tags' },
      ],
    };

    await createSchemaBuilder(db as any).dropSchema(schema as any);

    expect(raw).toHaveBeenCalledWith('ALTER TABLE ?? DROP CONSTRAINT IF EXISTS ??', [
      'public.articles',
      'articles_author_id_fk',
    ]);
    expect(schemaBuilder.dropTableIfExists).toHaveBeenCalledWith('tags');
  });
});

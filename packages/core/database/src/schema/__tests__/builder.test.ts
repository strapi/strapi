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
});

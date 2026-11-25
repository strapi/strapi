import createSchemaStorage from '../storage';

import type { Database } from '../..';
import type { Schema } from '../types';

describe('createSchemaStorage', () => {
  const minimalTable = (name: string) => ({
    name,
    columns: [{ name: 'id', type: 'increments', args: [] }],
    indexes: [],
    foreignKeys: [],
  });

  const mockDb = (): Database =>
    ({
      getSchemaConnection: jest.fn().mockReturnValue({
        hasTable: jest.fn().mockResolvedValue(false),
        createTable: jest.fn().mockResolvedValue(undefined),
      }),
      getConnection: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          into: jest.fn().mockResolvedValue(undefined),
        }),
        delete: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([]),
            where: jest.fn().mockResolvedValue(undefined),
          }),
        }),
        truncate: jest.fn().mockResolvedValue(undefined),
      }),
    }) as any;

  describe('hashSchema', () => {
    it('matches regardless of table order', () => {
      const storage = createSchemaStorage(mockDb());

      const a: Schema = {
        tables: [minimalTable('posts'), minimalTable('articles')],
      };

      const b: Schema = {
        tables: [minimalTable('articles'), minimalTable('posts')],
      };

      expect(storage.hashSchema(a)).toBe(storage.hashSchema(b));
    });

    it('does not mutate the schema tables array', () => {
      const storage = createSchemaStorage(mockDb());

      const tables = [minimalTable('zebra'), minimalTable('alpha')];
      const schema: Schema = { tables };

      storage.hashSchema(schema);

      expect(tables.map((t) => t.name)).toEqual(['zebra', 'alpha']);
    });
  });
});

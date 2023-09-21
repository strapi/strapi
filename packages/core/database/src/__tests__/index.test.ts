import { Database, DatabaseConfig } from '../index';

jest.mock('../connection', () => ({
  createConnection: jest.fn(() => {
    const trx = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    return {
      ...trx,
      transaction: jest.fn(async () => trx),
    };
  }),
}));

jest.mock('../dialects', () => ({
  getDialect: jest.fn(() => ({
    configure: jest.fn(),
    initialize: jest.fn(),
  })),
}));

jest.mock('../migrations', () => ({
  createMigrationsProvider: jest.fn(),
}));

const config: DatabaseConfig = {
  models: [
    {
      uid: 'test',
      singularName: 'test',
      tableName: 'strapi_core_store_settings',
      attributes: {},
    },
  ],
  connection: {
    client: 'postgres',
    connection: {
      database: 'strapi',
      user: 'strapi',
      password: 'strapi',
      port: 5432,
      host: 'localhost',
    },
  },
  settings: {},
};

describe('Database', () => {
  describe('constructor', () => {
    it('it should intialize if config is provided', async () => {
      expect(() => Database.init(config)).toBeDefined();
    });
  });

  describe('Transaction', () => {
    it('transaction should be defined', async () => {
      const db = await Database.init(config);
      expect(db.transaction).toBeDefined();
    });

    it('should return value if transaction is complete', async () => {
      const db = await Database.init(config);
      const result = await db.transaction(async () => 'test');
      expect(result).toBe('test');
      expect((db.connection as any).commit).toHaveBeenCalledTimes(1);
    });

    it('rollback is called incase of error', async () => {
      const db = await Database.init(config);
      try {
        await db.transaction(async () => {
          throw new Error('test');
        });
      } catch {
        /* ignore */
      }
      expect((db.connection as any).rollback).toHaveBeenCalledTimes(1);
    });

    it('should throw error', async () => {
      const db = await Database.init(config);

      expect(async () => {
        await db.transaction(async () => {
          throw new Error('test');
        });
      }).rejects.toThrowError('test');
    });
  });
});

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

const models = [
  {
    uid: 'test',
    singularName: 'test',
    tableName: 'strapi_core_store_settings',
    attributes: {},
  },
];

const config: DatabaseConfig = {
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
  settings: {
    migrations: {
      dir: 'migrations',
    },
  },
};

describe('Database', () => {
  describe('constructor', () => {
    it('it should intialize if config is provided', async () => {
      expect(() => new Database(config)).toBeDefined();
    });
  });

  describe('Transaction', () => {
    it('transaction should be defined', async () => {
      const db = new Database(config);
      expect(db.transaction).toBeDefined();
    });

    it('should return value if transaction is complete', async () => {
      const db = new Database(config);
      await db.init({ models });

      const result = await db.transaction(async () => 'test');
      expect(result).toBe('test');
      expect((db.connection as any).commit).toHaveBeenCalledTimes(1);
    });

    it('rollback is called incase of error', async () => {
      const db = new Database(config);
      await db.init({ models });

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
      const db = new Database(config);
      await db.init({ models });

      expect(async () => {
        await db.transaction(async () => {
          throw new Error('test');
        });
      }).rejects.toThrowError('test');
    });
  });
});

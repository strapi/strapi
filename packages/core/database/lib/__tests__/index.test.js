'use strict';

const { Database } = require('../index');

jest.mock('../connection', () =>
  jest.fn(() => {
    const trx = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    return {
      ...trx,
      transaction: jest.fn(async () => trx),
    };
  })
);

jest.mock('../dialects', () => ({
  getDialect: jest.fn(() => ({
    configure: jest.fn(),
    initialize: jest.fn(),
  })),
}));

jest.mock('../migrations', () => ({
  createMigrationsProvider: jest.fn(),
}));

const config = {
  models: [
    {
      tableName: 'strapi_core_store_settings',
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
};

describe('Database', () => {
  describe('constructor', () => {
    it('should throw an error if no config is provided', async () => {
      expect(async () => Database.init()).rejects.toThrowError();
    });

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
      expect(db.connection.commit).toHaveBeenCalledTimes(1);
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
      expect(db.connection.rollback).toHaveBeenCalledTimes(1);
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

import knex from 'knex';
import { Database, DatabaseConfig } from '../index';

// create an in-memory db connection to test
jest.mock('../connection', () => ({
  createConnection: jest.fn(() => {
    const db = knex({
      client: 'better-sqlite3',
      connection: {
        filename: ':memory:', // Use an in-memory database
      },
      useNullAsDefault: true, // Required for sqlite3
    });

    const trx = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    // Use Object.defineProperty to redefine the read-only properties
    Object.defineProperty(db, 'transaction', {
      value: jest.fn(async () => trx),
      writable: false,
    });

    Object.defineProperty(db, 'commit', {
      value: trx.commit,
      writable: false,
    });

    Object.defineProperty(db, 'rollback', {
      value: trx.rollback,
      writable: false,
    });

    return db;
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

const configConnectionObject: DatabaseConfig = {
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
const configConnectionFunction: DatabaseConfig = {
  connection: {
    client: 'sqlite',
    connection() {
      return {
        database: 'strapi',
        user: 'strapi',
        password: 'strapi',
        port: 5432,
        host: 'localhost',
      };
    },
  },
  settings: {
    migrations: {
      dir: 'migrations',
    },
  },
};

describe('Database', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  describe('constructor', () => {
    it('it should initialize if config is provided', async () => {
      expect(() => new Database(configConnectionObject)).toBeDefined();
    });

    it('connection should be defined', async () => {
      const db = new Database(configConnectionObject);
      expect(db.connection).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-var-requires, node/no-missing-require
      expect(require('../connection').createConnection).toHaveBeenCalledTimes(1);
    });

    it('config.connection object has connection.client in object format', async () => {
      const db = new Database(configConnectionObject);
      expect(db.connection.client.constructor.name).toBe('Client_BetterSQLite3');
      // eslint-disable-next-line @typescript-eslint/no-var-requires, node/no-missing-require
      expect(require('../connection').createConnection).toHaveBeenCalledTimes(1);
    });

    it('should issue a warning when connection function is passed', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const db = new Database(configConnectionFunction);
      expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/experimental/));
    });
  });

  describe('Connection', () => {
    const testCases = [
      { config: configConnectionObject, title: 'connection object' },
      { config: configConnectionFunction, title: 'connection function' },
    ];

    testCases.forEach(({ config, title }) => {
      it(`should init connection with ${title}`, async () => {
        const db = new Database(config);
        await db.init({ models });

        expect(db.connection.client.constructor.name).toBe('Client_BetterSQLite3');

        // eslint-disable-next-line @typescript-eslint/no-var-requires, node/no-missing-require
        expect(require('../connection').createConnection).toHaveBeenCalledTimes(1);

        await db.destroy();
      });
    });
  });
  describe('Transaction', () => {
    const transactionTestCases = [
      { config: configConnectionObject, title: 'connection object' },
      { config: configConnectionFunction, title: 'connection function' },
    ];

    transactionTestCases.forEach(({ config, title }) => {
      it(`transaction should be defined with ${title}`, async () => {
        const db = new Database(config);
        expect(db.transaction).toBeDefined();
      });

      it(`should return value if transaction is complete with ${title}`, async () => {
        const db = new Database(config);
        await db.init({ models });

        const result = await db.transaction(async () => 'test');
        expect(result).toBe('test');
        expect((db.connection as any).commit).toHaveBeenCalledTimes(1);
        await db.destroy();
      });

      it(`rollback is called in case of error with ${title}`, async () => {
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

        await db.destroy();
      });

      it(`should throw error with ${title}`, async () => {
        const db = new Database(config);
        await db.init({ models });

        await expect(async () => {
          await db.transaction(async () => {
            throw new Error('test');
          });
        }).rejects.toThrowError('test');

        await db.destroy();
      });
    });
  });
});

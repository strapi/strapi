import knex from 'knex';
import { Database, DatabaseConfig } from '../index';
import createQueryBuilder from '../query/query-builder';
import type { Model } from '../types';

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
    useReturning: () => false,
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

      it(`should not call commit on transactor already finalised (avoid double finalisation) with ${title}`, async () => {
        const db = new Database(config);
        await db.init({ models });

        const commitSpy = jest.fn();
        const trx = {
          commit: commitSpy,
          rollback: jest.fn(),
          isCompleted: () => true,
        };
        const transactionOverride = jest.fn(async () => trx);
        Object.defineProperty(db.connection, 'transaction', {
          value: transactionOverride,
          configurable: true,
        });

        const result = await db.transaction(async () => 'ok');
        expect(result).toBe('ok');
        expect(commitSpy).toHaveBeenCalledTimes(0);

        await db.destroy();
      });

      it(`should not call rollback on transactor already finalised (avoid double finalisation) with ${title}`, async () => {
        const db = new Database(config);
        await db.init({ models });

        const rollbackSpy = jest.fn();
        const trx = {
          commit: jest.fn(),
          rollback: rollbackSpy,
          isCompleted: () => true,
        };
        const transactionOverride = jest.fn(async () => trx);
        Object.defineProperty(db.connection, 'transaction', {
          value: transactionOverride,
          configurable: true,
        });

        try {
          await db.transaction(async () => {
            throw new Error('test');
          });
        } catch {
          // ignore
        }
        expect(rollbackSpy).toHaveBeenCalledTimes(0);

        await db.destroy();
      });
    });
  });
});

const articleModelForPaginationTests: Model = {
  uid: 'api::article.article',
  singularName: 'article',
  tableName: 'articles',
  attributes: {
    id: { type: 'integer' },
    title: { type: 'string' },
  },
};

/** Draft & publish fields required for `orderBy: { status }` (virtual sort → CASE expression). */
const articleWithStatusSortModel: Model = {
  uid: 'api::articlestatus.articlestatus',
  singularName: 'articlestatus',
  tableName: 'article_statuses',
  attributes: {
    id: { type: 'integer' },
    documentId: { type: 'string' },
    publishedAt: { type: 'datetime' },
    title: { type: 'string' },
  },
};

/** Synthetic table without PK `id` — documents `ensurePaginationOrderStability` early-return. */
const modelWithoutIdAttribute: Model = {
  uid: 'internal::noid.entry',
  singularName: 'noidentry',
  tableName: 'noid_entries',
  attributes: {
    slug: { type: 'string' },
  },
};

const paginationQueryBuilderConfig: DatabaseConfig = {
  connection: {
    client: 'sqlite',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  },
  settings: { migrations: { dir: 'migrations' } },
};

describe('Query builder pagination order stability (GH #26030)', () => {
  let db: Database;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});

    db = new Database(paginationQueryBuilderConfig);
    await db.init({ models: [articleModelForPaginationTests] });
  });

  it('appends primary key ASC to ORDER BY when using LIMIT/OFFSET without deep sort', () => {
    const qb = createQueryBuilder(articleModelForPaginationTests.uid, db)
      .init({
        limit: 10,
        offset: 20,
        orderBy: { title: 'asc' },
      })
      .getKnexQuery();

    const { sql } = qb.toSQL();
    const lower = sql.toLowerCase();

    expect(lower).toContain('order by');
    expect(lower).toContain('`t0`.`id` asc');
  });

  it('appends primary key when there is no user order (empty orderBy)', () => {
    const qb = createQueryBuilder(articleModelForPaginationTests.uid, db)
      .init({
        limit: 10,
        offset: 0,
        orderBy: [],
      })
      .getKnexQuery();

    const { sql } = qb.toSQL();
    const lower = sql.toLowerCase();

    expect(lower).toContain('order by');
    expect(lower).toContain('`t0`.`id` asc');
  });

  it('does not duplicate id when orderBy already ends with id', () => {
    const qb = createQueryBuilder(articleModelForPaginationTests.uid, db)
      .init({
        limit: 5,
        offset: 0,
        orderBy: { id: 'desc' },
      })
      .getKnexQuery();

    const { sql } = qb.toSQL();
    const idAscMatches = sql.match(/`t0`\.`id` asc/gi) ?? [];
    expect(idAscMatches.length).toBeLessThanOrEqual(1);
  });

  it('emits join order columns before root id tie-break (relation-style loads)', () => {
    const qb = createQueryBuilder(articleModelForPaginationTests.uid, db)
      .init({
        limit: 10,
        offset: 0,
        orderBy: [],
      })
      .join({
        alias: 't1',
        referencedTable: 'articles_shops_lnk',
        referencedColumn: 'article_id',
        rootColumn: 'id',
        rootTable: 't0',
        orderBy: { link_ord: 'desc' },
      })
      .getKnexQuery();

    const { sql } = qb.toSQL();
    const lower = sql.toLowerCase();

    const pivotIdx = lower.indexOf('`t1`.`link_ord` desc');
    const idIdx = lower.indexOf('`t0`.`id` asc');
    expect(pivotIdx).toBeGreaterThan(-1);
    expect(idIdx).toBeGreaterThan(-1);
    expect(pivotIdx).toBeLessThan(idIdx);
  });

  it('appends id tie-break after status (CASE) sort when paginated', async () => {
    const dbWithStatus = new Database(paginationQueryBuilderConfig);
    await dbWithStatus.init({ models: [articleWithStatusSortModel] });

    const qb = createQueryBuilder(articleWithStatusSortModel.uid, dbWithStatus)
      .init({
        limit: 5,
        offset: 0,
        orderBy: { status: 'desc' },
      })
      .getKnexQuery();

    const { sql } = qb.toSQL();
    const lower = sql.toLowerCase();

    expect(lower).toContain('case when');
    expect(lower).toContain('`t0`.`id` asc');
    expect(lower.indexOf('case when')).toBeLessThan(lower.indexOf('`t0`.`id` asc'));

    await dbWithStatus.destroy();
  });

  it('does not append id tie-break when the model has no id attribute', async () => {
    const dbNoId = new Database(paginationQueryBuilderConfig);
    await dbNoId.init({ models: [modelWithoutIdAttribute] });

    const qb = createQueryBuilder(modelWithoutIdAttribute.uid, dbNoId)
      .init({
        limit: 10,
        offset: 0,
        orderBy: { slug: 'asc' },
      })
      .getKnexQuery();

    const { sql } = qb.toSQL();
    const lower = sql.toLowerCase();
    expect(lower).toContain('order by');
    expect(lower).not.toContain('`t0`.`id`');

    await dbNoId.destroy();
  });
});

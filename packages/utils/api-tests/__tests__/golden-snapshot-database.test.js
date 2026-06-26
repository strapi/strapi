'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  captureDatabase,
  databaseSnapshotExists,
  normalizeClient,
  readDatabaseMeta,
  removeSqliteSidecars,
  resolveSqlitePath,
  restoreDatabase,
} = require('../golden-snapshot-database');

const { createStrapiInstance } = require('../strapi');

jest.mock('../strapi', () => ({
  createStrapiInstance: jest.fn(),
}));

describe('golden-snapshot-database', () => {
  let tmpDir;
  let appDir;
  let goldenDir;
  let envPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'golden-db-test-'));
    appDir = path.join(tmpDir, 'api');
    goldenDir = path.join(tmpDir, '.golden', 'api');
    envPath = path.join(appDir, '.env');
    fs.mkdirSync(path.join(appDir, 'tmp'), { recursive: true });
    process.env.ENV_PATH = envPath;
    process.env.JWT_SECRET = 'aSecret';
  });

  afterEach(() => {
    delete process.env.ENV_PATH;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('normalizeClient', () => {
    test('maps pg to postgres', () => {
      expect(normalizeClient('pg')).toBe('postgres');
    });

    test('returns other clients unchanged', () => {
      expect(normalizeClient('sqlite')).toBe('sqlite');
    });
  });

  describe('readDatabaseMeta', () => {
    test('reads sqlite client from .env', () => {
      fs.writeFileSync(
        envPath,
        'DATABASE_CLIENT=sqlite\nDATABASE_FILENAME=./tmp/data.db\n',
        'utf8'
      );

      expect(readDatabaseMeta(appDir)).toMatchObject({
        client: 'sqlite',
        connection: { filename: './tmp/data.db' },
      });
    });

    test('defaults to sqlite when .env is missing', () => {
      expect(readDatabaseMeta(appDir).client).toBe('sqlite');
    });
  });

  describe('resolveSqlitePath', () => {
    test('resolves relative paths against the app dir', () => {
      expect(resolveSqlitePath(appDir, './tmp/data.db')).toBe(path.join(appDir, 'tmp/data.db'));
    });

    test('keeps absolute paths', () => {
      const absolute = path.join(appDir, 'custom.db');
      expect(resolveSqlitePath(appDir, absolute)).toBe(absolute);
    });
  });

  describe('removeSqliteSidecars', () => {
    test('removes sqlite wal/shm/journal sidecars', async () => {
      const dbPath = path.join(appDir, 'tmp', 'data.db');
      fs.writeFileSync(dbPath, 'db');
      fs.writeFileSync(`${dbPath}-wal`, 'wal');
      fs.writeFileSync(`${dbPath}-shm`, 'shm');

      await removeSqliteSidecars(dbPath);

      expect(fs.existsSync(`${dbPath}-wal`)).toBe(false);
      expect(fs.existsSync(`${dbPath}-shm`)).toBe(false);
      expect(fs.existsSync(dbPath)).toBe(true);
    });
  });

  describe('databaseSnapshotExists', () => {
    test('returns false when meta is missing', () => {
      expect(databaseSnapshotExists(goldenDir)).toBe(false);
    });

    test('returns true when sqlite dump exists', async () => {
      const dbDir = path.join(goldenDir, 'database');
      fs.mkdirSync(dbDir, { recursive: true });
      fs.writeFileSync(path.join(dbDir, 'meta.json'), '{}', 'utf8');
      fs.writeFileSync(path.join(dbDir, 'data.db'), 'db', 'utf8');

      expect(databaseSnapshotExists(goldenDir)).toBe(true);
    });

    test('returns true when relational tables snapshot exists', async () => {
      const dbDir = path.join(goldenDir, 'database');
      fs.mkdirSync(dbDir, { recursive: true });
      fs.writeFileSync(path.join(dbDir, 'meta.json'), '{}', 'utf8');
      fs.writeFileSync(path.join(dbDir, 'tables.json'), '{"tables":[]}', 'utf8');

      expect(databaseSnapshotExists(goldenDir)).toBe(true);
    });
  });

  describe('captureDatabase (sqlite)', () => {
    test('copies sqlite file into golden database dir', async () => {
      fs.writeFileSync(
        envPath,
        'DATABASE_CLIENT=sqlite\nDATABASE_FILENAME=./tmp/data.db\n',
        'utf8'
      );
      const sqlitePath = path.join(appDir, 'tmp', 'data.db');
      fs.writeFileSync(sqlitePath, 'sqlite-bytes', 'utf8');

      const meta = await captureDatabase(null, goldenDir);

      expect(meta.client).toBe('sqlite');
      expect(fs.readFileSync(path.join(goldenDir, 'database', 'data.db'), 'utf8')).toBe(
        'sqlite-bytes'
      );
    });

    test('throws when sqlite database file is missing', async () => {
      fs.writeFileSync(
        envPath,
        'DATABASE_CLIENT=sqlite\nDATABASE_FILENAME=./tmp/data.db\n',
        'utf8'
      );

      await expect(captureDatabase(null, goldenDir)).rejects.toThrow(
        'golden-snapshot: sqlite database file not found'
      );
    });
  });

  describe('captureDatabase (relational)', () => {
    test('captures postgres tables as JSON', async () => {
      fs.writeFileSync(envPath, 'DATABASE_CLIENT=postgres\n', 'utf8');
      const strapi = {
        db: {
          config: { connection: { client: 'postgres' } },
          dialect: { schemaInspector: { getTables: jest.fn().mockResolvedValue(['articles']) } },
          connection: jest.fn(() => ({
            select: jest.fn().mockResolvedValue([{ id: 1, title: 'Hello' }]),
          })),
        },
      };

      const meta = await captureDatabase(strapi, goldenDir);
      const tables = JSON.parse(
        fs.readFileSync(path.join(goldenDir, 'database', 'tables.json'), 'utf8')
      );

      expect(meta.client).toBe('postgres');
      expect(tables.data.articles).toEqual([{ id: 1, title: 'Hello' }]);
    });

    test('rejects unsupported clients', async () => {
      fs.writeFileSync(envPath, 'DATABASE_CLIENT=foo\n', 'utf8');
      const strapi = {
        db: { config: { connection: { client: 'foo' } } },
      };

      await expect(captureDatabase(strapi, goldenDir)).rejects.toThrow(
        'unsupported database client'
      );
    });
  });

  describe('restoreDatabase (sqlite)', () => {
    test('restores sqlite dump to the app tmp dir', async () => {
      fs.writeFileSync(
        envPath,
        'DATABASE_CLIENT=sqlite\nDATABASE_FILENAME=./tmp/data.db\n',
        'utf8'
      );
      const dbDir = path.join(goldenDir, 'database');
      fs.mkdirSync(dbDir, { recursive: true });
      fs.writeFileSync(
        path.join(dbDir, 'meta.json'),
        JSON.stringify({ client: 'sqlite', sqliteFilename: './tmp/data.db' }),
        'utf8'
      );
      fs.writeFileSync(path.join(dbDir, 'data.db'), 'restored-db', 'utf8');

      await restoreDatabase(goldenDir);

      expect(fs.readFileSync(path.join(appDir, 'tmp', 'data.db'), 'utf8')).toBe('restored-db');
    });
  });

  describe('restoreDatabase (relational)', () => {
    test('boots strapi and restores relational snapshot', async () => {
      const dbDir = path.join(goldenDir, 'database');
      fs.mkdirSync(dbDir, { recursive: true });
      fs.writeFileSync(
        path.join(dbDir, 'meta.json'),
        JSON.stringify({ client: 'postgres' }),
        'utf8'
      );
      fs.writeFileSync(
        path.join(dbDir, 'tables.json'),
        JSON.stringify({ tables: ['articles'], data: { articles: [{ id: 1 }] } }),
        'utf8'
      );

      const del = jest.fn().mockResolvedValue(undefined);
      const insert = jest.fn().mockResolvedValue(undefined);
      const raw = jest.fn().mockResolvedValue(undefined);
      const dropTableIfExists = jest.fn().mockResolvedValue(undefined);
      const strapi = {
        db: {
          config: { connection: { client: 'postgres' } },
          dialect: {
            schemaInspector: { getTables: jest.fn().mockResolvedValue(['articles', 'extra']) },
            startSchemaUpdate: jest.fn().mockResolvedValue(undefined),
            endSchemaUpdate: jest.fn().mockResolvedValue(undefined),
          },
          connection: jest.fn(() => ({ del, insert })),
          getSchemaConnection: jest.fn(),
        },
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      strapi.db.connection.raw = raw;
      strapi.db.getSchemaConnection.mockReturnValue({ raw, schema: { dropTableIfExists } });

      createStrapiInstance.mockResolvedValue(strapi);

      await restoreDatabase(goldenDir);

      expect(createStrapiInstance).toHaveBeenCalled();
      expect(del).toHaveBeenCalled();
      expect(insert).toHaveBeenCalledWith([{ id: 1 }]);
      expect(strapi.destroy).toHaveBeenCalled();
    });
  });
});

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  captureGoldenSnapshot,
  getAppDir,
  getGoldenDir,
  goldenSnapshotExists,
  isGoldenRestoreSupported,
  restoreGoldenSnapshot,
  SNAPSHOT_DIRS,
} = require('../golden-snapshot');

describe('golden-snapshot', () => {
  let tmpDir;
  let appDir;
  let envPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'golden-fs-test-'));
    appDir = path.join(tmpDir, 'api');
    envPath = path.join(appDir, '.env');
    fs.mkdirSync(path.join(appDir, 'src', 'api'), { recursive: true });
    fs.mkdirSync(path.join(appDir, 'src', 'components'), { recursive: true });
    fs.mkdirSync(path.join(appDir, 'tmp'), { recursive: true });
    fs.writeFileSync(envPath, 'DATABASE_CLIENT=sqlite\nDATABASE_FILENAME=./tmp/data.db\n', 'utf8');
    fs.writeFileSync(path.join(appDir, 'tmp', 'data.db'), 'sqlite-db', 'utf8');
    process.env.ENV_PATH = envPath;
    process.env.JWT_SECRET = 'aSecret';
  });

  afterEach(() => {
    delete process.env.ENV_PATH;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('getAppDir requires ENV_PATH', () => {
    delete process.env.ENV_PATH;
    expect(() => getAppDir()).toThrow('ENV_PATH is not set');
  });

  test('getGoldenDir resolves sibling .golden directory', () => {
    expect(getGoldenDir(appDir)).toBe(path.join(tmpDir, '.golden', 'api'));
  });

  test('isGoldenRestoreSupported is true for sqlite only', () => {
    expect(isGoldenRestoreSupported(appDir)).toBe(true);

    fs.writeFileSync(envPath, 'DATABASE_CLIENT=postgres\n', 'utf8');
    expect(isGoldenRestoreSupported(appDir)).toBe(false);
  });

  test('captureGoldenSnapshot writes filesystem markers and sqlite dump', async () => {
    fs.writeFileSync(
      path.join(appDir, 'src', 'api', 'article.json'),
      '{"kind":"collectionType"}',
      'utf8'
    );

    const destroy = jest.fn().mockResolvedValue(undefined);
    const strapi = {
      db: { config: { connection: { client: 'sqlite' } } },
      config: { get: jest.fn().mockReturnValue('./tmp/data.db') },
      destroy,
    };

    const { goldenDir, client } = await captureGoldenSnapshot({ strapi });

    expect(client).toBe('sqlite');
    expect(destroy).toHaveBeenCalled();
    expect(fs.existsSync(path.join(goldenDir, 'database', 'data.db'))).toBe(true);
    for (const rel of SNAPSHOT_DIRS) {
      expect(fs.existsSync(path.join(goldenDir, rel, 'golden-empty'))).toBe(true);
    }
    expect(fs.readFileSync(path.join(goldenDir, 'src', 'api', 'article.json'), 'utf8')).toContain(
      'collectionType'
    );
  });

  test('goldenSnapshotExists detects complete snapshots', async () => {
    expect(goldenSnapshotExists()).toBe(false);

    const strapi = {
      db: { config: { connection: { client: 'sqlite' } } },
      config: { get: jest.fn().mockReturnValue('./tmp/data.db') },
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    await captureGoldenSnapshot({ strapi });

    expect(goldenSnapshotExists()).toBe(true);
  });

  test('restoreGoldenSnapshot restores filesystem and sqlite database', async () => {
    const strapi = {
      db: { config: { connection: { client: 'sqlite' } } },
      config: { get: jest.fn().mockReturnValue('./tmp/data.db') },
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    await captureGoldenSnapshot({ strapi });

    fs.writeFileSync(path.join(appDir, 'src', 'api', 'temp.json'), '{"temp":true}', 'utf8');
    fs.writeFileSync(path.join(appDir, 'tmp', 'data.db'), 'mutated-db', 'utf8');
    fs.mkdirSync(path.join(appDir, 'src', 'extensions', 'documentation', 'documentation'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(appDir, 'src', 'extensions', 'documentation', 'documentation', 'openapi.json'),
      '{}',
      'utf8'
    );

    await restoreGoldenSnapshot();

    expect(fs.existsSync(path.join(appDir, 'src', 'api', 'temp.json'))).toBe(false);
    expect(fs.existsSync(path.join(appDir, 'src', 'api', 'golden-empty'))).toBe(false);
    expect(fs.readFileSync(path.join(appDir, 'tmp', 'data.db'), 'utf8')).toBe('sqlite-db');
    expect(
      fs.existsSync(path.join(appDir, 'src', 'extensions', 'documentation', 'documentation'))
    ).toBe(false);
  });

  test('restoreGoldenSnapshot throws when snapshot is missing', async () => {
    await expect(restoreGoldenSnapshot()).rejects.toThrow('missing snapshot');
  });

  test('restoreGoldenSnapshot rejects non-sqlite clients', async () => {
    const strapi = {
      db: { config: { connection: { client: 'sqlite' } } },
      config: { get: jest.fn().mockReturnValue('./tmp/data.db') },
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    await captureGoldenSnapshot({ strapi });

    fs.writeFileSync(envPath, 'DATABASE_CLIENT=postgres\n', 'utf8');
    await expect(restoreGoldenSnapshot()).rejects.toThrow('sqlite only');
  });

  test('captureGoldenSnapshot rejects unsupported database clients', async () => {
    fs.writeFileSync(envPath, 'DATABASE_CLIENT=foo\n', 'utf8');
    const strapi = {
      db: { config: { connection: { client: 'foo' } } },
      destroy: jest.fn(),
    };

    await expect(captureGoldenSnapshot({ strapi })).rejects.toThrow('unsupported DATABASE_CLIENT');
  });
});

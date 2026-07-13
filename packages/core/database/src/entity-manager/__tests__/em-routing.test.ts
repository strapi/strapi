import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import { Database, DatabaseConfig } from '../../index';
import type { Model } from '../../types';

const model: Model = {
  uid: 'api::article.article',
  singularName: 'article',
  tableName: 'articles',
  attributes: {
    id: { type: 'integer' },
    title: { type: 'string' },
  },
};

// Execution tests need an on-disk SQLite file (a literal ':memory:' filename
// leaves a stray file in cwd once real queries run). Keep it in the OS temp dir
// and remove it after each test so nothing leaks into the repo.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-em-routing-'));

const configFor = (filename: string): DatabaseConfig => ({
  connection: {
    client: 'sqlite',
    connection: { filename },
    useNullAsDefault: true,
  },
  settings: { migrations: { dir: 'migrations' } },
});

describe('repository forwards routing overrides', () => {
  let db: Database;
  let dbFile: string;
  let counter = 0;

  beforeEach(async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    counter += 1;
    dbFile = path.join(tmpDir, `${process.pid}-${counter}.sqlite`);
    db = new Database(configFor(dbFile));
    await db.init({ models: [model] });

    const exists = await db.connection.schema.hasTable('articles');
    if (!exists) {
      await db.connection.schema.createTable('articles', (t) => {
        t.increments('id');
        t.string('title');
      });
    }
  });

  afterEach(async () => {
    await db.destroy();
    fs.rmSync(dbFile, { force: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const optionsForArticles = () => {
    const spy = jest.spyOn(db, 'getConnection');
    return () => {
      const call = spy.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('articles')
      );
      spy.mockRestore();
      return (call?.[1] ?? {}) as { replica?: boolean; writer?: boolean };
    };
  };

  it('findMany forwards replica:true', async () => {
    const read = optionsForArticles();
    await db.query(model.uid).findMany({ replica: true });
    expect(read().replica).toBe(true);
  });

  it('count forwards replica:true', async () => {
    const read = optionsForArticles();
    await db.query(model.uid).count({ replica: true });
    expect(read().replica).toBe(true);
  });

  it('findMany forwards writer:true', async () => {
    const read = optionsForArticles();
    await db.query(model.uid).findMany({ writer: true });
    expect(read().writer).toBe(true);
  });
});

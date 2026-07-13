import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import { Database, DatabaseConfig } from '../../index';
import { routingCtx } from '../../routing-context';
import createQueryBuilder from '../query-builder';
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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-db-routing-'));

const configFor = (filename: string): DatabaseConfig => ({
  connection: {
    client: 'sqlite',
    connection: { filename },
    useNullAsDefault: true,
  },
  settings: { migrations: { dir: 'migrations' } },
});

describe('query-builder read/write routing', () => {
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
  });

  afterEach(async () => {
    await db.destroy();
    fs.rmSync(dbFile, { force: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const intentFor = (build: (qb: ReturnType<typeof createQueryBuilder>) => void) => {
    const spy = jest.spyOn(db, 'getConnection');
    const qb = createQueryBuilder(model.uid, db);
    build(qb);
    qb.getKnexQuery();
    // the table-bound getConnection call carries the routing options
    const call = spy.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('articles'));
    spy.mockRestore();
    return (call?.[1] ?? {}) as { intent?: string; writer?: boolean; replica?: boolean };
  };

  describe('intent derivation', () => {
    it('marks a select as a read', () => {
      expect(intentFor((qb) => qb.select('*')).intent).toBe('read');
    });

    it('marks a count as a read', () => {
      expect(intentFor((qb) => qb.count()).intent).toBe('read');
    });

    it('marks an insert as a write', () => {
      expect(intentFor((qb) => qb.insert({ title: 'x' })).intent).toBe('write');
    });

    it('marks an update as a write', () => {
      expect(intentFor((qb) => qb.update({ title: 'x' })).intent).toBe('write');
    });

    it('marks a delete as a write', () => {
      expect(intentFor((qb) => qb.delete()).intent).toBe('write');
    });

    it('marks a locking select (forUpdate) as a write', () => {
      expect(intentFor((qb) => qb.select('*').forUpdate()).intent).toBe('write');
    });
  });

  describe('per-query overrides', () => {
    it('threads writer:true from init params', () => {
      expect(intentFor((qb) => qb.init({ writer: true })).writer).toBe(true);
    });

    it('threads replica:true from init params', () => {
      expect(intentFor((qb) => qb.init({ replica: true })).replica).toBe(true);
    });
  });

  describe('write stickiness', () => {
    beforeEach(async () => {
      const exists = await db.connection.schema.hasTable('articles');
      if (!exists) {
        await db.connection.schema.createTable('articles', (t) => {
          t.increments('id');
          t.string('title');
        });
      }
    });

    it('marks the routing scope dirty after a write executes', async () => {
      await routingCtx.run(async () => {
        expect(routingCtx.isDirty()).toBe(false);
        await createQueryBuilder(model.uid, db).insert({ title: 'hello' }).execute();
        expect(routingCtx.isDirty()).toBe(true);
      });
    });

    it('does not mark the scope dirty after a read executes', async () => {
      await routingCtx.run(async () => {
        await createQueryBuilder(model.uid, db).select('*').execute();
        expect(routingCtx.isDirty()).toBe(false);
      });
    });
  });
});

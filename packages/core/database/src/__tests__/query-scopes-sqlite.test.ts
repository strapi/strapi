import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Database } from '..';

/**
 * Query scopes against a real database.
 *
 * The unit tests check the clause that comes out; this checks the rows that come
 * back — from a real engine, through the real query builder, including the
 * separate queries a populated relation issues. That last one is the reason
 * scopes exist at the query layer rather than in a lifecycle: nothing above the
 * query builder sees those queries.
 */
describe('query scopes against SQLite', () => {
  let db: Database;
  let directory: string;

  /** Which tenant the scope is currently pretending to be. */
  let tenant: number | null = null;

  const ARTICLE = 'api::article.article';
  const AUTHOR = 'api::author.author';

  beforeAll(async () => {
    // A file rather than `:memory:`: knex pools connections, and each in-memory
    // connection is its own database.
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-query-scopes-'));

    db = new Database({
      connection: {
        client: 'sqlite',
        connection: { filename: path.join(directory, 'test.db') },
        useNullAsDefault: true,
      },
      settings: { migrations: { dir: './migrations' } },
      logger: { info() {}, warn() {}, error() {}, debug() {} },
    });

    await db.init({
      models: [
        {
          uid: AUTHOR,
          singularName: 'author',
          tableName: 'authors',
          attributes: {
            id: { type: 'increments' },
            documentId: { type: 'string' },
            name: { type: 'string' },
            tenant: { type: 'integer', columnName: 'tenant_id' },
          },
        },
        {
          uid: ARTICLE,
          singularName: 'article',
          tableName: 'articles',
          attributes: {
            id: { type: 'increments' },
            documentId: { type: 'string' },
            title: { type: 'string' },
            tenant: { type: 'integer', columnName: 'tenant_id' },
            author: {
              type: 'relation',
              relation: 'manyToOne',
              target: AUTHOR,
              useJoinTable: false,
            },
          },
        },
      ] as never,
    });

    await db.schema.sync();

    // Two tenants, and one row belonging to neither.
    await db.query(AUTHOR).createMany({
      data: [
        { id: 1, documentId: 'a1', name: 'Amélie', tenant: 1 },
        { id: 2, documentId: 'a2', name: 'Anton', tenant: 2 },
        { id: 3, documentId: 'a3', name: 'Anonymous', tenant: null },
      ],
    });

    await db.query(ARTICLE).createMany({
      data: [
        { id: 1, documentId: 'd1', title: 'Bonjour', tenant: 1, author: 1 },
        { id: 2, documentId: 'd2', title: 'Guten Tag', tenant: 2, author: 2 },
        { id: 3, documentId: 'd3', title: 'Notice', tenant: null, author: 3 },
        // Tenant 1's, but pointing at tenant 2's author — the shape that only
        // the populate query can catch.
        { id: 4, documentId: 'd4', title: 'Crossed', tenant: 1, author: 2 },
      ],
    });

    db.queryScopes.register('tenancy', ({ meta }) => {
      if (!meta.attributes.tenant || tenant === null) {
        return null;
      }

      return { $or: [{ tenant_id: tenant }, { tenant_id: { $null: true } }] };
    });
  });

  afterAll(async () => {
    await db.destroy();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  beforeEach(() => {
    tenant = null;
  });

  describe('reading', () => {
    it('returns everything when no tenant is in force', async () => {
      const rows = await db.query(ARTICLE).findMany({});

      expect(rows).toHaveLength(4);
    });

    it('returns one tenant’s rows, plus the shared one', async () => {
      tenant = 1;

      const titles = (await db.query(ARTICLE).findMany({})).map((row: any) => row.title);

      expect(titles).toEqual(expect.arrayContaining(['Bonjour', 'Notice']));
      expect(titles).not.toContain('Guten Tag');
    });

    it('does not find another tenant’s row by id', async () => {
      tenant = 1;

      const row = await db.query(ARTICLE).findOne({ where: { id: 2 } });

      expect(row).toBeNull();
    });

    it('counts only what it can see', async () => {
      tenant = 2;

      // Its own row, and the shared one — not tenant 1's two.
      expect(await db.query(ARTICLE).count({})).toBe(2);
    });

    it('cannot be widened with an $or', async () => {
      tenant = 1;

      const rows = await db.query(ARTICLE).findMany({
        where: { $or: [{ title: 'Bonjour' }, { title: 'Guten Tag' }] },
      });

      expect(rows.map((row: any) => row.title)).toEqual(['Bonjour']);
    });

    it('cannot be widened by naming the scoped column', async () => {
      tenant = 1;

      const rows = await db.query(ARTICLE).findMany({ where: { tenant: 2 } });

      expect(rows).toHaveLength(0);
    });
  });

  describe('populating a relation', () => {
    it('hides a related row belonging to another tenant', async () => {
      tenant = 1;

      // Tenant 1 reaches its own article, but that article points at an author
      // it may not see. Populating issues a second query against `authors`,
      // which nothing above the query builder ever sees.
      const row: any = await db.query(ARTICLE).findOne({ where: { id: 4 }, populate: ['author'] });

      expect(row.title).toBe('Crossed');
      expect(row.author).toBeNull();
    });

    it('still returns a related row in the same tenant', async () => {
      tenant = 1;

      const row: any = await db.query(ARTICLE).findOne({ where: { id: 1 }, populate: ['author'] });

      expect(row.author?.name).toBe('Amélie');
    });

    it('still returns a shared related row', async () => {
      tenant = 1;

      const row: any = await db.query(ARTICLE).findOne({ where: { id: 3 }, populate: ['author'] });

      expect(row.author?.name).toBe('Anonymous');
    });
  });

  describe('writing', () => {
    it('does not update another tenant’s row', async () => {
      tenant = 1;

      await db.query(ARTICLE).updateMany({ where: { id: 2 }, data: { title: 'Overwritten' } });

      tenant = null;
      const row: any = await db.query(ARTICLE).findOne({ where: { id: 2 } });

      expect(row.title).toBe('Guten Tag');
    });

    it('does not update every row when the filter matches everything', async () => {
      tenant = 1;

      await db.query(ARTICLE).updateMany({ where: {}, data: { title: 'Swept' } });

      tenant = null;
      const rows: any[] = await db.query(ARTICLE).findMany({ orderBy: { id: 'asc' } });

      // The other tenant's row is untouched; this tenant's own, and the shared
      // row it may write, are not.
      expect(rows[1].title).toBe('Guten Tag');
      expect(rows[0].title).toBe('Swept');

      await db.query(ARTICLE).updateMany({ where: { id: 1 }, data: { title: 'Bonjour' } });
      await db.query(ARTICLE).updateMany({ where: { id: 3 }, data: { title: 'Notice' } });
    });

    it('does not delete another tenant’s row', async () => {
      tenant = 1;

      await db.query(ARTICLE).deleteMany({ where: { id: 2 } });

      tenant = null;
      expect(await db.query(ARTICLE).findOne({ where: { id: 2 } })).not.toBeNull();
    });
  });
});

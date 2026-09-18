import path from 'path';
import os from 'os';
import fse from 'fs-extra';

import { Database } from '../../index';

jest.mock('../../migrations/internal-migrations', () => ({ internalMigrations: [] }));

const createLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('schema rename helpers (sqlite)', () => {
  let workDir: string;
  let db: Database;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(async () => {
    workDir = fse.mkdtempSync(path.join(os.tmpdir(), 'rename-helpers-'));
    logger = createLogger();
    db = new Database({
      connection: {
        client: 'sqlite',
        connection: { filename: path.join(workDir, 'test.db') },
        useNullAsDefault: true,
        // A single connection: the helpers must never reach for `db.connection`
        // while the migration transaction holds it, or they would deadlock.
        pool: { min: 0, max: 1 },
      },
      settings: {
        migrations: { dir: path.join(workDir, 'migrations') },
      },
      logger,
    });
    await db.connection.raw('SELECT 1');
  });

  afterEach(async () => {
    await db.destroy();
    fse.removeSync(workDir);
  });

  const inTransaction = <T>(fn: (trx: any) => Promise<T>) => db.transaction(({ trx }) => fn(trx));

  describe('renameColumn', () => {
    const op = { table: 'articles', from: 'old_title', to: 'new_title' };

    it('renames the column and preserves its data', async () => {
      await db.connection.schema.createTable('articles', (table) => {
        table.increments('id');
        table.string('old_title');
      });
      await db.connection('articles').insert({ old_title: 'Hello' });

      const applied = await inTransaction((trx) => db.schema.renameColumn(trx, op));

      expect(applied).toBe(true);
      expect(await db.connection.schema.hasColumn('articles', 'new_title')).toBe(true);
      expect(await db.connection.schema.hasColumn('articles', 'old_title')).toBe(false);
      expect(await db.connection('articles').select('new_title')).toEqual([{ new_title: 'Hello' }]);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[rename migration] applied')
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('is a quiet (info-level) no-op when the table does not exist yet', async () => {
      const applied = await inTransaction((trx) => db.schema.renameColumn(trx, op));

      expect(applied).toBe(false);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          '[rename migration] skipped: Rename column articles.old_title to new_title (table "articles" does not exist)'
        )
      );
    });

    it('is a quiet (info-level) no-op when the source column does not exist', async () => {
      await db.connection.schema.createTable('articles', (table) => {
        table.increments('id');
        table.string('new_title');
      });

      const applied = await inTransaction((trx) => db.schema.renameColumn(trx, op));

      expect(applied).toBe(false);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('column "articles.old_title" does not exist')
      );
      expect(await db.connection.schema.hasColumn('articles', 'new_title')).toBe(true);
    });

    it('warns and leaves both columns untouched when the target already exists', async () => {
      await db.connection.schema.createTable('articles', (table) => {
        table.increments('id');
        table.string('old_title');
        table.string('new_title');
      });
      await db.connection('articles').insert({ old_title: 'Old', new_title: 'New' });

      const applied = await inTransaction((trx) =>
        db.schema.renameColumn(trx, { ...op, comment: 'api::article.article: rename "a" -> "b"' })
      );

      expect(applied).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        '[rename migration] skipped: api::article.article: rename "a" -> "b" (column "articles.new_title" already exists)'
      );
      expect(await db.connection('articles').select('old_title', 'new_title')).toEqual([
        { old_title: 'Old', new_title: 'New' },
      ]);
    });
  });

  describe('renameTable', () => {
    const op = { from: 'articles_tags_lnk', to: 'articles_labels_lnk' };

    it('renames the table and preserves its rows', async () => {
      await db.connection.schema.createTable('articles_tags_lnk', (table) => {
        table.increments('id');
        table.integer('article_id');
      });
      await db.connection('articles_tags_lnk').insert({ article_id: 12 });

      const applied = await inTransaction((trx) => db.schema.renameTable(trx, op));

      expect(applied).toBe(true);
      expect(await db.connection.schema.hasTable('articles_labels_lnk')).toBe(true);
      expect(await db.connection.schema.hasTable('articles_tags_lnk')).toBe(false);
      expect(await db.connection('articles_labels_lnk').select('article_id')).toEqual([
        { article_id: 12 },
      ]);
    });

    it('is a quiet no-op when the source table does not exist', async () => {
      const applied = await inTransaction((trx) => db.schema.renameTable(trx, op));

      expect(applied).toBe(false);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('table "articles_tags_lnk" does not exist')
      );
    });

    it('warns when the target table already exists', async () => {
      await db.connection.schema.createTable('articles_tags_lnk', (table) => {
        table.increments('id');
      });
      await db.connection.schema.createTable('articles_labels_lnk', (table) => {
        table.increments('id');
      });

      const applied = await inTransaction((trx) => db.schema.renameTable(trx, op));

      expect(applied).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('table "articles_labels_lnk" already exists')
      );
      expect(await db.connection.schema.hasTable('articles_tags_lnk')).toBe(true);
    });
  });

  describe('updateRows', () => {
    it('updates only the matching rows', async () => {
      await db.connection.schema.createTable('articles_cmps', (table) => {
        table.increments('id');
        table.string('component_type');
        table.string('field');
      });
      await db.connection('articles_cmps').insert([
        { component_type: 'default.old-box', field: 'zone' },
        { component_type: 'default.other-box', field: 'zone' },
      ]);

      const applied = await inTransaction((trx) =>
        db.schema.updateRows(trx, {
          table: 'articles_cmps',
          where: { component_type: 'default.old-box' },
          set: { component_type: 'default.new-box' },
        })
      );

      expect(applied).toBe(true);
      expect(await db.connection('articles_cmps').select('component_type').orderBy('id')).toEqual([
        { component_type: 'default.new-box' },
        { component_type: 'default.other-box' },
      ]);
    });

    it('scopes the update by every where clause', async () => {
      await db.connection.schema.createTable('files_related_morphs', (table) => {
        table.increments('id');
        table.string('related_type');
        table.string('field');
      });
      await db.connection('files_related_morphs').insert([
        { related_type: 'api::article.article', field: 'cover' },
        { related_type: 'api::page.page', field: 'cover' },
      ]);

      await inTransaction((trx) =>
        db.schema.updateRows(trx, {
          table: 'files_related_morphs',
          guardColumn: 'field',
          where: { field: 'cover', related_type: 'api::article.article' },
          set: { field: 'image' },
        })
      );

      expect(
        await db.connection('files_related_morphs').select('related_type', 'field').orderBy('id')
      ).toEqual([
        { related_type: 'api::article.article', field: 'image' },
        { related_type: 'api::page.page', field: 'cover' },
      ]);
    });

    it('is a quiet no-op when the table or guard column does not exist', async () => {
      const missingTable = await inTransaction((trx) =>
        db.schema.updateRows(trx, {
          table: 'articles_cmps',
          where: { field: 'a' },
          set: { field: 'b' },
        })
      );
      expect(missingTable).toBe(false);

      await db.connection.schema.createTable('articles_cmps', (table) => {
        table.increments('id');
      });
      const missingColumn = await inTransaction((trx) =>
        db.schema.updateRows(trx, {
          table: 'articles_cmps',
          where: { field: 'a' },
          set: { field: 'b' },
        })
      );
      expect(missingColumn).toBe(false);

      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('column "articles_cmps.field" does not exist')
      );
    });
  });
});

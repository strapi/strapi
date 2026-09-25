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

    it('drops indexes named after the old column so re-adding it cannot collide', async () => {
      const { identifiers } = db.metadata;
      const indexName = identifiers.getIndexName(['articles', 'old_title']);
      const uniqueName = identifiers.getUniqueIndexName(['articles', 'old_title']);

      await db.connection.schema.createTable('articles', (table) => {
        table.increments('id');
        table.string('old_title');
        table.string('other');
        table.index(['old_title'], indexName);
        table.unique(['old_title'], { indexName: uniqueName });
        table.index(['other'], 'articles_other_idx');
      });

      await inTransaction((trx) => db.schema.renameColumn(trx, op));

      const indexes = await db.dialect.schemaInspector.getIndexes('articles');
      expect(indexes.map((index) => index.name)).toEqual(['articles_other_idx']);

      // What schema sync does when a later save re-adds `old_title`.
      await expect(
        db.connection.schema.alterTable('articles', (table) => {
          table.string('old_title');
          table.index(['old_title'], indexName);
          table.unique(['old_title'], { indexName: uniqueName });
        })
      ).resolves.not.toThrow();
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

    it('deletes orphan rows already carrying the target value before updating', async () => {
      await db.connection.schema.createTable('files_related_mph', (table) => {
        table.increments('id');
        table.integer('file_id');
        table.string('related_type');
        table.string('field');
      });
      await db.connection('files_related_mph').insert([
        // Left behind when an attribute named `image` was deleted earlier.
        { file_id: 1, related_type: 'api::article.article', field: 'image' },
        { file_id: 2, related_type: 'api::article.article', field: 'cover' },
        { file_id: 3, related_type: 'api::page.page', field: 'image' },
        { file_id: 4, related_type: 'api::page.page', field: 'cover' },
      ]);

      const applied = await inTransaction((trx) =>
        db.schema.updateRows(trx, {
          table: 'files_related_mph',
          guardColumn: 'field',
          where: { field: 'cover', related_type: 'api::article.article' },
          set: { field: 'image' },
        })
      );

      expect(applied).toBe(true);
      expect(
        await db
          .connection('files_related_mph')
          .select('file_id', 'related_type', 'field')
          .orderBy('file_id')
      ).toEqual([
        { file_id: 2, related_type: 'api::article.article', field: 'image' },
        { file_id: 3, related_type: 'api::page.page', field: 'image' },
        { file_id: 4, related_type: 'api::page.page', field: 'cover' },
      ]);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[rename migration] removed 1 orphan row(s)')
      );
    });

    it('does not log a removal when there are no orphan rows', async () => {
      await db.connection.schema.createTable('articles_cmps', (table) => {
        table.increments('id');
        table.string('field');
      });
      await db.connection('articles_cmps').insert([{ field: 'hero' }]);

      await inTransaction((trx) =>
        db.schema.updateRows(trx, {
          table: 'articles_cmps',
          where: { field: 'hero' },
          set: { field: 'banner' },
        })
      );

      expect(await db.connection('articles_cmps').select('field')).toEqual([{ field: 'banner' }]);
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('orphan'));
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

  describe('renameTable index names', () => {
    it('drops indexes named after the old table so re-creating it cannot collide', async () => {
      const { identifiers } = db.metadata;
      const fk = identifiers.getFkIndexName('articles_a_lnk');
      const invFk = identifiers.getInverseFkIndexName('articles_a_lnk');
      const unique = identifiers.getUniqueIndexName('articles_a_lnk');

      await db.connection.schema.createTable('articles_a_lnk', (table) => {
        table.increments('id');
        table.integer('article_id');
        table.integer('tag_id');
        table.index(['article_id'], fk);
        table.index(['tag_id'], invFk);
        table.unique(['article_id', 'tag_id'], { indexName: unique });
      });

      await inTransaction((trx) =>
        db.schema.renameTable(trx, { from: 'articles_a_lnk', to: 'articles_b_lnk' })
      );

      const indexes = await db.dialect.schemaInspector.getIndexes('articles_b_lnk');
      expect(indexes).toEqual([]);
    });
  });

  describe('attribute renames', () => {
    const op = {
      renames: { 'api::article.article': { title: 'heading' } },
      comment: 'remap field permissions',
    };

    it('dispatches to every registered handler, in order, with the transaction', async () => {
      const calls: Array<[string, unknown, unknown]> = [];
      const first = jest.fn(async (trx: unknown, renames: unknown) => {
        calls.push(['first', trx, renames]);
      });
      const second = jest.fn(async (trx: unknown, renames: unknown) => {
        calls.push(['second', trx, renames]);
      });
      const unregisterFirst = db.schema.registerAttributeRenameHandler(first);
      const unregisterSecond = db.schema.registerAttributeRenameHandler(second);

      let transaction: unknown;
      const applied = await inTransaction((trx) => {
        transaction = trx;
        return db.schema.applyAttributeRenames(trx, op);
      });

      expect(applied).toBe(true);
      expect(calls).toEqual([
        ['first', transaction, op.renames],
        ['second', transaction, op.renames],
      ]);
      expect(logger.info).toHaveBeenCalledWith(
        '[rename migration] applied: remap field permissions'
      );

      unregisterFirst();
      unregisterSecond();
    });

    it('stops calling a handler once it is unregistered', async () => {
      const handler = jest.fn(async () => {});
      const unregister = db.schema.registerAttributeRenameHandler(handler);
      unregister();

      const applied = await inTransaction((trx) => db.schema.applyAttributeRenames(trx, op));

      expect(applied).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    it('is a debug-level no-op without handlers', async () => {
      const applied = await inTransaction((trx) => db.schema.applyAttributeRenames(trx, op));

      expect(applied).toBe(false);
      expect(logger.info).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[rename migration] skipped: remap field permissions')
      );
    });

    it('propagates a handler failure so the migration transaction rolls back', async () => {
      const unregister = db.schema.registerAttributeRenameHandler(async () => {
        throw new Error('boom');
      });

      await expect(
        inTransaction((trx) => db.schema.applyAttributeRenames(trx, op))
      ).rejects.toThrow('boom');

      unregister();
    });
  });
});

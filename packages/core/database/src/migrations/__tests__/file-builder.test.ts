import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

import { createMigrationFileBuilder } from '../file-builder';

const createDbMock = ({ migrationsDir }: { migrationsDir?: string } = {}) =>
  ({
    config: {
      settings: {
        migrations: { dir: migrationsDir },
      },
    },
  }) as any;

describe('MigrationFileBuilder', () => {
  describe('build', () => {
    it('renders guarded column renames', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });

      builder.renameColumn({
        table: 'articles',
        from: 'old_title',
        to: 'new_title',
        comment: 'api::article.article: rename field "oldTitle" -> "newTitle"',
      });

      const result = builder.build({ name: 'rename-fields' });
      expect(result).not.toBeNull();
      expect(result!.content).toContain("hasTable('articles')");
      expect(result!.content).toContain("hasColumn('articles', 'old_title')");
      expect(result!.content).toContain("renameColumn('old_title', 'new_title')");
    });

    it('renders guarded table renames', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });

      builder.renameTable({
        from: 'articles_tags_lnk',
        to: 'articles_labels_lnk',
      });

      const result = builder.build({ name: 'rename-fields' })!;
      expect(result.content).toContain("hasTable('articles_tags_lnk')");
      expect(result.content).toContain("hasTable('articles_labels_lnk')");
      expect(result.content).toContain("renameTable('articles_tags_lnk', 'articles_labels_lnk')");
    });

    it('renders guarded row updates with multiple where clauses', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });

      builder.updateRows({
        table: 'files_related_morphs',
        guardColumn: 'field',
        where: {
          field: 'cover',
          related_type: 'api::article.article',
        },
        set: {
          field: 'image',
        },
      });

      const result = builder.build({ name: 'rename-fields' })!;
      expect(result.content).toContain("hasTable('files_related_morphs')");
      expect(result.content).toContain("hasColumn('files_related_morphs', 'field')");
      expect(result.content).toContain(
        "knex('files_related_morphs').where('field', 'cover').where('related_type', 'api::article.article').update('field', 'image')"
      );
    });

    it('collapses multiple operations into one CommonJS file in order', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });

      builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });
      builder.renameColumn({ table: 'articles', from: 'summary', to: 'excerpt' });

      const result = builder.build({ name: 'rename-fields' })!;
      const headingIdx = result.content.indexOf("'heading'");
      const excerptIdx = result.content.indexOf("'excerpt'");

      expect(result.filename).toMatch(/\.rename-fields\.js$/);
      expect(result.content).toContain('module.exports');
      expect(result.content.match(/async up/g)?.length).toBe(1);
      expect(excerptIdx).toBeGreaterThan(headingIdx);
    });

    it('uses a full sortable millisecond timestamp in the filename', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });
      builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });

      const result = builder.build({ name: 'rename-fields' })!;
      expect(result.filename).toMatch(
        /^\d{4}\.\d{2}\.\d{2}T\d{2}\.\d{2}\.\d{2}\.\d{3}\.rename-fields\.js$/
      );
    });

    it('returns null when there are no operations', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });
      expect(builder.hasChanges()).toBe(false);
      expect(builder.build({ name: 'rename-fields' })).toBeNull();
    });
  });

  describe('writeFiles', () => {
    it('creates the migrations dir and writes one file', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'db-migration-write-'));
      const migrationsDir = path.join(tmp, 'database', 'migrations');
      const builder = createMigrationFileBuilder({ db: createDbMock({ migrationsDir }) });
      builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });

      const written = await builder.writeFiles({ name: 'rename-fields' });

      expect(written).not.toBeNull();
      expect(fs.existsSync(migrationsDir)).toBe(true);
      const files = fs.readdirSync(migrationsDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/\.rename-fields\.js$/);
      expect(fs.readFileSync(path.join(migrationsDir, files[0]), 'utf8')).toContain(
        "renameColumn('old_title', 'heading')"
      );
      fs.removeSync(tmp);
    });

    it('never overwrites an existing migration with the same timestamp', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'db-migration-collide-'));
      const migrationsDir = path.join(tmp, 'database', 'migrations');

      const buildOne = () => {
        const builder = createMigrationFileBuilder({ db: createDbMock({ migrationsDir }) });
        builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });
        return builder;
      };

      const spy = jest.spyOn(Date.prototype, 'toJSON').mockReturnValue('2026-01-01T00:00:00.000Z');
      const built = buildOne().build({ name: 'rename-fields' })!;
      fs.ensureDirSync(migrationsDir);
      fs.writeFileSync(path.join(migrationsDir, built.filename), '// existing');

      const writtenPath = await buildOne().writeFiles({ name: 'rename-fields' });
      spy.mockRestore();

      expect(writtenPath).not.toBeNull();
      expect(fs.readFileSync(writtenPath as string, 'utf8')).not.toBe('// existing');
      expect(fs.readdirSync(migrationsDir)).toHaveLength(2);
      fs.removeSync(tmp);
    });
  });
});

import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

import { createMigrationFileBuilder, getFormattedTimestamp } from '../file-builder';
import { discoverMigrationFiles } from '../discover';

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
    it('renders column renames as guarded helper calls', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });

      builder.renameColumn({
        table: 'articles',
        from: 'old_title',
        to: 'new_title',
        comment: 'api::article.article: rename field "oldTitle" -> "newTitle"',
      });

      const result = builder.build({ name: 'rename-fields' });
      expect(result).not.toBeNull();
      expect(result!.content).toContain(
        '// api::article.article: rename field "oldTitle" -> "newTitle"'
      );
      expect(result!.content).toContain(
        "await db.schema.renameColumn(knex, { table: 'articles', from: 'old_title', to: 'new_title' });"
      );
      // Guards and dialect handling live in the helper, not in the generated file.
      expect(result!.content).not.toContain('hasTable');
      expect(result!.content).not.toContain('hasColumn');
    });

    it('renders table renames as helper calls', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });

      builder.renameTable({
        from: 'articles_tags_lnk',
        to: 'articles_labels_lnk',
      });

      const result = builder.build({ name: 'rename-fields' })!;
      expect(result.content).toContain('// Rename table articles_tags_lnk to articles_labels_lnk');
      expect(result.content).toContain(
        "await db.schema.renameTable(knex, { from: 'articles_tags_lnk', to: 'articles_labels_lnk' });"
      );
    });

    it('renders row updates with multiple where clauses as helper calls', () => {
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
      expect(result.content).toContain('await db.schema.updateRows(knex, {');
      expect(result.content).toContain("table: 'files_related_morphs',");
      expect(result.content).toContain("guardColumn: 'field',");
      expect(result.content).toContain(
        "where: { field: 'cover', related_type: 'api::article.article' },"
      );
      expect(result.content).toContain("set: { field: 'image' },");
    });

    it('defaults the guard column to the first updated column', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });

      builder.updateRows({
        table: 'articles_cmps',
        where: { component_type: 'default.old' },
        set: { component_type: 'default.new' },
      });

      expect(builder.build({ name: 'rename-fields' })!.content).toContain(
        "guardColumn: 'component_type',"
      );
    });

    it('escapes quotes and backslashes in identifiers and values', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });

      builder.updateRows({
        table: 'articles_cmps',
        where: { field: "it's", 'weird-key': 'x' },
        set: { field: 'back\\slash' },
      });

      const content = builder.build({ name: 'rename-fields' })!.content;
      expect(content).toContain("where: { field: 'it\\'s', 'weird-key': 'x' },");
      expect(content).toContain("set: { field: 'back\\\\slash' },");
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
      expect(result.content).toContain('async up(knex, db)');
      expect(result.content.match(/async up/g)?.length).toBe(1);
      expect(excerptIdx).toBeGreaterThan(headingIdx);
    });

    it('matches the JavaScript snapshot', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });
      builder.renameColumn({
        table: 'articles',
        from: 'bio',
        to: 'biography',
        comment: 'api::article.article: rename field "bio" -> "biography"',
      });
      builder.renameTable({
        from: 'articles_tags_lnk',
        to: 'articles_labels_lnk',
        comment: 'api::article.article: rename field "tags" -> "labels"',
      });
      builder.updateRows({
        table: 'articles_cmps',
        guardColumn: 'field',
        where: { field: 'hero' },
        set: { field: 'banner' },
        comment: 'api::article.article: rename field "hero" -> "banner"',
      });

      const spy = jest.spyOn(Date.prototype, 'toJSON').mockReturnValue('2026-01-01T00:00:00.000Z');
      const result = builder.build({ name: 'rename-fields' })!;
      spy.mockRestore();

      expect(result.content).toMatchSnapshot();
    });

    it('matches the TypeScript snapshot', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });
      builder.renameColumn({
        table: 'articles',
        from: 'bio',
        to: 'biography',
        comment: 'api::article.article: rename field "bio" -> "biography"',
      });

      const spy = jest.spyOn(Date.prototype, 'toJSON').mockReturnValue('2026-01-01T00:00:00.000Z');
      const result = builder.build({ name: 'rename-fields', format: 'typescript' })!;
      spy.mockRestore();

      expect(result.content).toMatchSnapshot();
    });

    it('emits an ES module with typed signatures and a .ts extension for the typescript format', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });
      builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });

      const result = builder.build({ name: 'rename-fields', format: 'typescript' })!;

      expect(result.filename).toMatch(
        /^\d{4}\.\d{2}\.\d{2}T\d{2}\.\d{2}\.\d{2}\.\d{3}\.rename-fields\.ts$/
      );
      expect(result.content).toContain("import type { Knex } from 'knex';");
      expect(result.content).toContain("import type { Core } from '@strapi/strapi';");
      expect(result.content).toContain('export default {');
      expect(result.content).toContain("async up(knex: Knex, db: Core.Strapi['db'])");
      expect(result.content).not.toContain('module.exports');
      // The body is identical to the JavaScript output.
      expect(result.content).toContain(
        "await db.schema.renameColumn(knex, { table: 'articles', from: 'old_title', to: 'heading' });"
      );
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

  describe('getFormattedTimestamp', () => {
    it('uses UTC so files sort the same regardless of the developer time zone', () => {
      const date = new Date('2026-03-04T05:06:07.089Z');

      expect(getFormattedTimestamp(date)).toBe('2026.03.04T05.06.07.089');
    });

    it('keeps the generator prefix shape so it interleaves with `strapi generate migration`', () => {
      // The generator emits `YYYY.MM.DDTHH.mm.ss.<name>`; the builder adds
      // milliseconds after the seconds so the shared prefix sorts identically.
      const generated = getFormattedTimestamp(new Date('2026-03-04T05:06:07.089Z'));
      expect(generated.startsWith('2026.03.04T05.06.07')).toBe(true);
    });
  });

  describe('ordering with user-authored migrations', () => {
    let tmp: string;

    beforeEach(() => {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'db-migration-order-'));
    });

    afterEach(() => {
      fs.removeSync(tmp);
    });

    it('sorts a generated migration between user migrations by timestamp prefix', async () => {
      const builder = createMigrationFileBuilder({ db: createDbMock({ migrationsDir: tmp }) });
      builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });

      const spy = jest.spyOn(Date.prototype, 'toJSON').mockReturnValue('2026-06-15T12:00:00.500Z');
      const generatedPath = (await builder.writeFiles({ name: 'rename-fields' })) as string;
      spy.mockRestore();

      // User migrations written with `strapi generate migration` (second precision).
      const before = path.join(tmp, '2026.06.15T11.59.59.seed-authors.js');
      const after = path.join(tmp, '2026.06.15T12.00.01.backfill-slugs.js');
      fs.writeFileSync(before, 'module.exports = {};');
      fs.writeFileSync(after, 'module.exports = {};');

      expect(discoverMigrationFiles(tmp)).toEqual([before, generatedPath, after]);
    });

    it('sorts a generated migration before a user migration created in the same second', async () => {
      const builder = createMigrationFileBuilder({ db: createDbMock({ migrationsDir: tmp }) });
      builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });

      const spy = jest.spyOn(Date.prototype, 'toJSON').mockReturnValue('2026-06-15T12:00:00.500Z');
      const generatedPath = (await builder.writeFiles({ name: 'rename-fields' })) as string;
      spy.mockRestore();

      const sameSecond = path.join(tmp, '2026.06.15T12.00.00.same-second.js');
      fs.writeFileSync(sameSecond, 'module.exports = {};');

      // Within the same second the generated file's millisecond digits sort
      // before a user file's (letter-initial) name, so it runs first. Names are
      // compared as plain strings; there is no finer ordering than that.
      expect(discoverMigrationFiles(tmp)).toEqual([generatedPath, sameSecond]);
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
        "db.schema.renameColumn(knex, { table: 'articles', from: 'old_title', to: 'heading' })"
      );
      fs.removeSync(tmp);
    });

    it('writes a .ts file for the typescript format', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'db-migration-write-ts-'));
      const migrationsDir = path.join(tmp, 'database', 'migrations');
      const builder = createMigrationFileBuilder({ db: createDbMock({ migrationsDir }) });
      builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });

      const written = await builder.writeFiles({ name: 'rename-fields', format: 'typescript' });

      expect(written).toMatch(/\.rename-fields\.ts$/);
      expect(fs.readFileSync(written as string, 'utf8')).toContain('export default {');
      fs.removeSync(tmp);
    });

    it.each(['javascript', 'typescript'] as const)(
      'never overwrites an existing %s migration with the same timestamp',
      async (format) => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'db-migration-collide-'));
        const migrationsDir = path.join(tmp, 'database', 'migrations');
        const extension = format === 'typescript' ? 'ts' : 'js';

        const buildOne = () => {
          const builder = createMigrationFileBuilder({ db: createDbMock({ migrationsDir }) });
          builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });
          return builder;
        };

        const spy = jest
          .spyOn(Date.prototype, 'toJSON')
          .mockReturnValue('2026-01-01T00:00:00.000Z');
        const built = buildOne().build({ name: 'rename-fields', format })!;
        fs.ensureDirSync(migrationsDir);
        fs.writeFileSync(path.join(migrationsDir, built.filename), '// existing');

        const writtenPath = await buildOne().writeFiles({ name: 'rename-fields', format });
        spy.mockRestore();

        expect(writtenPath).not.toBeNull();
        expect(path.basename(writtenPath as string)).toBe(
          `2026.01.01T00.00.00.000.rename-fields-1.${extension}`
        );
        expect(fs.readFileSync(writtenPath as string, 'utf8')).not.toBe('// existing');
        expect(fs.readdirSync(migrationsDir)).toHaveLength(2);
        fs.removeSync(tmp);
      }
    );

    it('writes to an explicit dir override instead of the configured dir', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'db-migration-dir-'));
      // The configured dir points at build output (e.g. dist); the override is
      // the app source dir the Content-Type Builder passes explicitly.
      const configuredDir = path.join(tmp, 'dist', 'database', 'migrations');
      const overrideDir = path.join(tmp, 'database', 'migrations');
      const builder = createMigrationFileBuilder({
        db: createDbMock({ migrationsDir: configuredDir }),
      });
      builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });

      const written = await builder.writeFiles({ name: 'rename-fields', dir: overrideDir });

      expect(written).not.toBeNull();
      expect(written as string).toContain(overrideDir);
      expect(fs.existsSync(configuredDir)).toBe(false);
      expect(fs.readdirSync(overrideDir)).toHaveLength(1);
      fs.removeSync(tmp);
    });
  });
});

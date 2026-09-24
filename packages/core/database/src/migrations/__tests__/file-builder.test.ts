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

    it.each(['\n', '\r\n', '\u2028', '\u2029'])(
      'flattens a comment containing %j to one line so it cannot inject code',
      (lineBreak) => {
        const builder = createMigrationFileBuilder({ db: createDbMock() });
        const payload = `x${lineBreak}require('child_process').execSync('touch /tmp/pwned');//`;

        builder.renameColumn({ table: 'articles', from: 'a', to: 'b', comment: payload });
        builder.renameTable({ from: 'a_lnk', to: 'b_lnk', comment: payload });
        builder.updateRows({ table: 't', where: { f: 'a' }, set: { f: 'b' }, comment: payload });
        builder.attributeRenames({ renames: { 'api::a.a': { a: 'b' } }, comment: payload });

        const content = builder.build({ name: 'rename-fields' })!.content;
        const injected = content.split('\n').filter((line) => line.includes('execSync'));

        expect(injected).toHaveLength(4);
        for (const line of injected) {
          expect(line.trimStart().startsWith('//')).toBe(true);
          expect(line).not.toMatch(/[\r\u2028\u2029]/);
        }
      }
    );

    it('flattens line breaks in default comments built from identifiers', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });
      builder.renameTable({ from: 'a\nprocess.exit(1)', to: 'b' });

      const content = builder.build({ name: 'rename-fields' })!.content;

      expect(content).toContain('// Rename table a process.exit(1) to b');
      expect(content).toContain("{ from: 'a\\nprocess.exit(1)', to: 'b' }");
    });

    it('renders attribute renames as one nested, fully quoted helper call', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });

      builder.attributeRenames({
        renames: {
          'api::article.article': { title: 'heading', hero: 'banner' },
          'default.hero': { "it's": 'label' },
        },
      });

      const content = builder.build({ name: 'rename-fields' })!.content;

      expect(content).toContain(
        "    // Update stores keyed by attribute name (admin field permissions) for this save's renames\n" +
          '    await db.schema.applyAttributeRenames(knex, {\n' +
          '      renames: {\n' +
          "        'api::article.article': { 'title': 'heading', 'hero': 'banner' },\n" +
          "        'default.hero': { 'it\\'s': 'label' },\n" +
          '      },\n' +
          '    });'
      );
      expect(builder.getOperations()).toEqual([
        expect.objectContaining({ kind: 'attributeRenames' }),
      ]);
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
      builder.attributeRenames({
        renames: {
          'api::article.article': { bio: 'biography', tags: 'labels', hero: 'banner' },
          'default.hero': { caption: 'label' },
        },
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
      builder.attributeRenames({ renames: { 'api::article.article': { bio: 'biography' } } });

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

    it('returns a copy of the recorded operations', () => {
      const builder = createMigrationFileBuilder({ db: createDbMock() });
      expect(builder.getOperations()).toEqual([]);

      builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });

      expect(builder.getOperations()).toEqual([
        expect.objectContaining({ kind: 'renameColumn', from: 'old_title', to: 'heading' }),
      ]);
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
    it('returns null when there are no operations', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'db-migration-write-empty-'));
      const migrationsDir = path.join(tmp, 'database', 'migrations');
      const builder = createMigrationFileBuilder({ db: createDbMock({ migrationsDir }) });

      await expect(builder.writeFiles({ name: 'rename-fields' })).resolves.toBeNull();
      expect(fs.existsSync(migrationsDir)).toBe(false);
      fs.removeSync(tmp);
    });

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
      'bumps the timestamp by 1ms instead of overwriting an existing %s migration',
      async (format) => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'db-migration-collide-'));
        const migrationsDir = path.join(tmp, 'database', 'migrations');
        const extension = format === 'typescript' ? 'ts' : 'js';
        const now = new Date('2026-01-01T00:00:00.000Z').getTime();

        const buildOne = () => {
          const builder = createMigrationFileBuilder({ db: createDbMock({ migrationsDir }) });
          builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });
          return builder;
        };

        const spy = jest.spyOn(Date, 'now').mockReturnValue(now);
        fs.ensureDirSync(migrationsDir);
        // Two files already hold the first two candidate timestamps.
        for (const ms of [0, 1]) {
          const built = buildOne().build({ name: 'rename-fields', format }, new Date(now + ms))!;
          fs.writeFileSync(path.join(migrationsDir, built.filename), '// existing');
        }

        const writtenPath = await buildOne().writeFiles({ name: 'rename-fields', format });
        spy.mockRestore();

        expect(path.basename(writtenPath as string)).toBe(
          `2026.01.01T00.00.00.002.rename-fields.${extension}`
        );
        const content = fs.readFileSync(writtenPath as string, 'utf8');
        expect(content).toContain('Auto-generated by Strapi on 2026.01.01T00.00.00.002.');
        expect(fs.readdirSync(migrationsDir)).toHaveLength(3);
        // The new file sorts after the ones it collided with.
        expect(fs.readdirSync(migrationsDir).sort().at(-1)).toBe(
          path.basename(writtenPath as string)
        );
        fs.removeSync(tmp);
      }
    );

    it('throws after 1000 colliding timestamps', async () => {
      const builder = createMigrationFileBuilder({ db: createDbMock({ migrationsDir: '/x' }) });
      builder.renameColumn({ table: 'articles', from: 'old_title', to: 'heading' });

      const ensureDir = jest.spyOn(fs, 'ensureDir').mockImplementation(async () => undefined);
      const pathExists = jest.spyOn(fs, 'pathExists').mockImplementation(async () => true);

      await expect(builder.writeFiles({ name: 'rename-fields' })).rejects.toThrow(
        'after 1000 attempts'
      );
      expect(pathExists).toHaveBeenCalledTimes(1000);

      ensureDir.mockRestore();
      pathExists.mockRestore();
    });

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

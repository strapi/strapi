import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { snakeCase } from 'lodash/fp';

import { createMigrationBuilder } from '..';

const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const getFormattedTimestamp = (date: Date = new Date()): string => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toJSON()
    .replace(/[-:]/g, '.')
    .replace(/Z$/, '');
};

const createTestMigrationFileBuilder = ({ migrationsDir }: { migrationsDir?: string } = {}) => {
  type Operation =
    | { kind: 'renameColumn'; table: string; from: string; to: string; comment?: string }
    | { kind: 'renameTable'; from: string; to: string; comment?: string }
    | {
        kind: 'updateRows';
        table: string;
        guardColumn?: string;
        where: Record<string, string>;
        set: Record<string, string>;
        comment?: string;
      };

  const operations: Operation[] = [];

  const renderOperation = (op: Operation): string => {
    if (op.kind === 'renameColumn') {
      return `    // ${op.comment ?? ''}
    if (await knex.schema.hasColumn(${quote(op.table)}, ${quote(op.from)})) {
      await knex.schema.alterTable(${quote(op.table)}, (table) => {
        table.renameColumn(${quote(op.from)}, ${quote(op.to)});
      });
    }`;
    }

    if (op.kind === 'renameTable') {
      return `    // ${op.comment ?? ''}
    if (
      (await knex.schema.hasTable(${quote(op.from)})) &&
      !(await knex.schema.hasTable(${quote(op.to)}))
    ) {
      await knex.schema.renameTable(${quote(op.from)}, ${quote(op.to)});
    }`;
    }

    const [setColumn, setValue] = Object.entries(op.set)[0];
    const where = Object.entries(op.where)
      .map(([column, value]) => `.where(${quote(column)}, ${quote(value)})`)
      .join('');

    return `    // ${op.comment ?? ''}
    if (await knex.schema.hasColumn(${quote(op.table)}, ${quote(op.guardColumn ?? setColumn)})) {
      await knex(${quote(op.table)})${where}.update(${quote(setColumn)}, ${quote(setValue)});
    }`;
  };

  return {
    renameColumn(op: Omit<Extract<Operation, { kind: 'renameColumn' }>, 'kind'>): void {
      operations.push({ kind: 'renameColumn', ...op });
    },
    renameTable(op: Omit<Extract<Operation, { kind: 'renameTable' }>, 'kind'>): void {
      operations.push({ kind: 'renameTable', ...op });
    },
    updateRows(op: Omit<Extract<Operation, { kind: 'updateRows' }>, 'kind'>): void {
      operations.push({ kind: 'updateRows', ...op });
    },
    hasChanges(): boolean {
      return operations.length > 0;
    },
    build({ name }: { name: string }) {
      if (operations.length === 0) {
        return null;
      }
      const timestamp = getFormattedTimestamp();
      const body = operations.map(renderOperation).join('\n\n');
      return {
        filename: `${timestamp}.${name}.js`,
        content: `'use strict';

module.exports = {
  async up(knex) {
${body}
  },
  async down(knex) {
  },
};
`,
      };
    },
    async writeFiles({ name }: { name: string }) {
      const built = this.build({ name });
      if (!built || !migrationsDir) {
        return null;
      }

      fs.ensureDirSync(migrationsDir);
      let filePath = path.join(migrationsDir, built.filename);
      for (let suffix = 1; fs.pathExistsSync(filePath); suffix += 1) {
        filePath = path.join(migrationsDir, built.filename.replace(/\.js$/, `-${suffix}.js`));
      }
      fs.writeFileSync(filePath, built.content, 'utf8');
      return filePath;
    },
  };
};

/**
 * Build a fake `strapi` with a metadata map + identifiers, mirroring the shape
 * the real `strapi.db.metadata` exposes (see packages/core/database metadata).
 */
const createStrapiMock = ({
  metas = {},
  migrationsDir,
  useTypescriptMigrations = false,
  identifiers,
  schema,
}: {
  metas?: Record<string, any>;
  migrationsDir?: string;
  useTypescriptMigrations?: boolean;
  identifiers?: Partial<Record<string, jest.Mock>>;
  // schema attribute types per uid, used by the builder to distinguish e.g.
  // media (unsupported) from components/dynamic zones that share the same
  // morph-join-table metadata shape.
  schema?: Record<string, Record<string, { type: string }>>;
} = {}) => {
  const metadata = new Map<string, any>(Object.entries(metas));

  const idents = identifiers ?? {
    // default: behave like a no-op shortener so identifiers are deterministic
    getColumnName: jest.fn((name: string) => name),
    getJoinColumnAttributeIdName: jest.fn((name: string) => `${name}_id`),
    getJoinTableName: jest.fn((table: string, name: string) => `${table}_${name}_lnk`),
    FIELD_COLUMN: 'field',
  };

  (metadata as any).identifiers = idents;

  const models: Record<string, { attributes: Record<string, { type: string }> }> = {};
  for (const [uid, attrs] of Object.entries(schema ?? {})) {
    models[uid] = { attributes: attrs };
  }

  const db = {
    metadata,
    config: {
      settings: {
        migrations: { dir: migrationsDir },
        useTypescriptMigrations,
      },
    },
  };

  (db as any).migrations = {
    createFileBuilder: () => createTestMigrationFileBuilder({ migrationsDir }),
  };

  return {
    contentTypes: models,
    components: {},
    db,
    dirs: {
      app: { root: migrationsDir ? path.dirname(path.dirname(migrationsDir)) : process.cwd() },
    },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as any;
};

const scalarMeta = {
  'api::article.article': {
    tableName: 'articles',
    attributes: {
      oldTitle: { type: 'string', columnName: 'old_title' },
      summary: { type: 'text', columnName: 'summary' },
      author: { type: 'relation', relation: 'manyToMany', target: 'api::author.author' },
      blocks: { type: 'dynamiczone' },
    },
  },
};

describe('MigrationBuilder', () => {
  describe('addRenameAttribute + build', () => {
    it('resolves real identifiers (old columnName from metadata, new via identifiers)', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'newTitle',
      });

      const result = builder.build();
      expect(result).not.toBeNull();
      expect(result!.content).toContain("hasColumn('articles', 'old_title')");
      // new column resolved via identifiers.getColumnName(snakeCase(newName))
      expect(result!.content).toContain("renameColumn('old_title', 'new_title')");
      expect(strapi.db.metadata.identifiers.getColumnName).toHaveBeenCalledWith(
        snakeCase('newTitle')
      );
    });

    it('uses the (possibly hashed) value returned by identifiers verbatim for long names', () => {
      const getColumnName = jest.fn(() => 'a_very_long_field_name_th3f5a2');
      const strapi = createStrapiMock({
        metas: {
          'api::article.article': {
            tableName: 'articles',
            attributes: {
              old: { type: 'string', columnName: 'old_col' },
            },
          },
        },
        identifiers: { getColumnName },
      });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::article.article', {
        oldName: 'old',
        newName: 'aVeryLongFieldNameThatExceedsTheLimit',
      });

      const result = builder.build();
      expect(getColumnName).toHaveBeenCalledWith(
        snakeCase('aVeryLongFieldNameThatExceedsTheLimit')
      );
      expect(result!.content).toContain(
        "renameColumn('old_col', 'a_very_long_field_name_th3f5a2')"
      );
    });

    it('collapses multiple renames into a single file, preserving order', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'summary',
        newName: 'excerpt',
      });

      const result = builder.build()!;
      const headingIdx = result.content.indexOf("'heading'");
      const excerptIdx = result.content.indexOf("'excerpt'");
      expect(headingIdx).toBeGreaterThan(-1);
      expect(excerptIdx).toBeGreaterThan(headingIdx);
      // single up() block
      expect(result.content.match(/async up/g)?.length).toBe(1);
    });

    it('emits guarded existence checks for fresh-DB safety', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });

      const result = builder.build()!;
      expect(result.content).toContain('await knex.schema.hasColumn');
      expect(result.content).toMatch(/if \(await knex\.schema\.hasColumn/);
    });

    it('skips no-op renames where the resolved column does not change', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });
      // oldTitle -> oldTitle resolves to the same column (old_title), so it is a no-op
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'oldTitle',
      });

      expect(builder.hasChanges()).toBe(false);
      expect(builder.build()).toBeNull();
    });

    it('returns null when there are no supported changes', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });
      expect(builder.build()).toBeNull();
    });
  });

  describe('ordered-path replay (no synthetic temp columns)', () => {
    const renamesFrom = (content: string): string[][] =>
      [...content.matchAll(/renameColumn\('([^']+)', '([^']+)'\)/g)].map((m) => [m[1], m[2]]);

    it("replays a user-routed swap verbatim using the user's own intermediate column", () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });

      // The CTB never lets two fields share a name, so a swap is performed by the
      // user as: oldTitle -> tmp, summary -> oldTitle, tmp -> summary.
      builder.addRenameAttribute('api::article.article', { oldName: 'oldTitle', newName: 'tmp' });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'summary',
        newName: 'oldTitle',
      });
      builder.addRenameAttribute('api::article.article', { oldName: 'tmp', newName: 'summary' });

      const result = builder.build()!;

      // Verbatim, in order — no `strapi_tmp_` synthesized, no reordering.
      expect(renamesFrom(result.content)).toEqual([
        ['old_title', 'tmp'],
        ['summary', 'old_title'],
        ['tmp', 'summary'],
      ]);
      expect(result.content).not.toContain('strapi_tmp_');
      expect(result.content).not.toContain('temporary column');
    });

    it('replays a rename chain (a -> b -> c) verbatim in order', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'heading',
        newName: 'finalTitle',
      });

      const result = builder.build()!;
      expect(renamesFrom(result.content)).toEqual([
        ['old_title', 'heading'],
        ['heading', 'final_title'],
      ]);
    });

    it('replays a rename-back (a -> b -> a) verbatim (net no-op at runtime)', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'heading',
        newName: 'oldTitle',
      });

      const result = builder.build()!;
      expect(renamesFrom(result.content)).toEqual([
        ['old_title', 'heading'],
        ['heading', 'old_title'],
      ]);
    });

    it('handles a "shift" across two fields (a -> b, c -> a) without a temp column', () => {
      const shiftMeta = {
        'api::foo.foo': {
          tableName: 'foos',
          attributes: {
            colA: { type: 'string', columnName: 'col_a' },
            colB: { type: 'string', columnName: 'col_b' },
            colC: { type: 'string', columnName: 'col_c' },
          },
        },
      };
      const strapi = createStrapiMock({ metas: shiftMeta });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::foo.foo', { oldName: 'colA', newName: 'colB' });
      builder.addRenameAttribute('api::foo.foo', { oldName: 'colC', newName: 'colA' });

      const result = builder.build()!;
      expect(renamesFrom(result.content)).toEqual([
        ['col_a', 'col_b'],
        ['col_c', 'col_a'],
      ]);
      expect(result.content).not.toContain('strapi_tmp_');
    });

    it('continues an in-flight chain even when an intermediate name is not a known attribute', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });

      // `tmp` is never a real attribute in metadata; it only exists mid-batch.
      builder.addRenameAttribute('api::article.article', { oldName: 'oldTitle', newName: 'tmp' });
      builder.addRenameAttribute('api::article.article', { oldName: 'tmp', newName: 'heading' });

      expect(builder.getUnsupported()).toHaveLength(0);
      expect(renamesFrom(builder.build()!.content)).toEqual([
        ['old_title', 'tmp'],
        ['tmp', 'heading'],
      ]);
    });
  });

  describe('relations, components & dynamic zones', () => {
    // Mirrors the resolved metadata shapes from packages/core/database (relations.ts):
    // join columns live on the model's table, join tables encode the owning
    // attribute name, and components/DZ store the attribute name as a value in a
    // shared link table's `field` column.
    const relMeta = {
      'api::article.article': {
        tableName: 'articles',
        singularName: 'article',
        attributes: {
          // owner relation backed by a join column on `articles` (useJoinTable:false)
          category: {
            type: 'relation',
            relation: 'manyToOne',
            joinColumn: { name: 'category_id' },
          },
          // owner relation backed by a join/link table
          tags: {
            type: 'relation',
            relation: 'manyToMany',
            inversedBy: 'articles',
            joinTable: { name: 'articles_tags_lnk' },
          },
          // inverse side of a bidirectional relation (named from the owner)
          editors: {
            type: 'relation',
            relation: 'manyToMany',
            mappedBy: 'articles',
            joinTable: { name: 'editors_articles_lnk' },
          },
          // component: morphToMany + on.field in the per-CT link table
          hero: {
            type: 'relation',
            relation: 'morphToMany',
            joinTable: { name: 'articles_cmps', on: { field: 'hero' } },
          },
          // dynamic zone: same shape as a component
          blocks: {
            type: 'relation',
            relation: 'morphToMany',
            joinTable: { name: 'articles_cmps', on: { field: 'blocks' } },
          },
          // real polymorphic relation -> unsupported
          related: {
            type: 'relation',
            relation: 'morphToMany',
            joinTable: { name: 'articles_related_morphs' },
            morphColumn: { typeColumn: { name: 'related_type' } },
          },
          // media -> shared files morph table, scoped by related_type
          cover: {
            type: 'relation',
            relation: 'morphToMany',
            joinTable: { name: 'files_related_morphs', on: { field: 'cover' } },
          },
        },
      },
      // The upload file model exposes the shared morph table used by all media.
      'plugin::upload.file': {
        tableName: 'files',
        attributes: {
          related: {
            type: 'relation',
            relation: 'morphToMany',
            joinTable: {
              name: 'files_related_morphs',
              morphColumn: { typeColumn: { name: 'related_type' } },
            },
          },
        },
      },
    };
    const relSchema = {
      'api::article.article': { cover: { type: 'media' } },
    };

    it('renames a join column on the model table (<field>_id)', () => {
      const strapi = createStrapiMock({ metas: relMeta, schema: relSchema });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'category',
        newName: 'section',
      });

      const result = builder.build()!;
      expect(result.content).toContain("hasColumn('articles', 'category_id')");
      expect(result.content).toContain("renameColumn('category_id', 'section_id')");
      expect(builder.getUnsupported()).toHaveLength(0);
    });

    it('renames a relation join/link table', () => {
      const strapi = createStrapiMock({ metas: relMeta, schema: relSchema });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', { oldName: 'tags', newName: 'labels' });

      const result = builder.build()!;
      expect(result.content).toContain("hasTable('articles_tags_lnk')");
      expect(result.content).toContain("renameTable('articles_tags_lnk', 'articles_labels_lnk')");
      expect(builder.getUnsupported()).toHaveLength(0);
    });

    it('updates the link-table field value for components and dynamic zones', () => {
      const strapi = createStrapiMock({ metas: relMeta, schema: relSchema });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', { oldName: 'hero', newName: 'banner' });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'blocks',
        newName: 'sections',
      });

      const result = builder.build()!;
      expect(result.content).toContain("hasColumn('articles_cmps', 'field')");
      expect(result.content).toContain(
        "knex('articles_cmps').where('field', 'hero').update('field', 'banner')"
      );
      expect(result.content).toContain(
        "knex('articles_cmps').where('field', 'blocks').update('field', 'sections')"
      );
      expect(builder.getUnsupported()).toHaveLength(0);
    });

    it('treats the inverse side of a bidirectional relation as a no-op (table named from owner)', () => {
      const strapi = createStrapiMock({ metas: relMeta, schema: relSchema });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'editors',
        newName: 'reviewers',
      });

      expect(builder.hasChanges()).toBe(false);
      expect(builder.getUnsupported()).toHaveLength(0);
    });

    it('updates the shared morph table (scoped by related_type) for media fields', () => {
      const strapi = createStrapiMock({ metas: relMeta, schema: relSchema });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', { oldName: 'cover', newName: 'image' });

      const result = builder.build()!;
      expect(result.content).toContain("hasColumn('files_related_morphs', 'field')");
      expect(result.content).toContain(
        "knex('files_related_morphs').where('field', 'cover').where('related_type', 'api::article.article').update('field', 'image')"
      );
      expect(builder.getUnsupported()).toHaveLength(0);
    });

    it('treats a field on the shared upload morph table as media even without a schema type', () => {
      // Hardening: if the schema-type lookup is unavailable, a media field must
      // still be detected (and scoped by related_type) rather than falling into
      // the unscoped component branch and corrupting other types' media.
      const strapi = createStrapiMock({ metas: relMeta /* no schema provided */ });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', { oldName: 'cover', newName: 'image' });

      const result = builder.build()!;
      expect(result.content).toContain(
        "knex('files_related_morphs').where('field', 'cover').where('related_type', 'api::article.article').update('field', 'image')"
      );
      expect(builder.getUnsupported()).toHaveLength(0);
    });

    it('records polymorphic morph relations as unsupported', () => {
      const strapi = createStrapiMock({ metas: relMeta, schema: relSchema });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', { oldName: 'related', newName: 'links' });

      expect(builder.hasChanges()).toBe(false);
      expect(builder.getUnsupported()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ oldName: 'related', reason: 'unsupported-type' }),
        ])
      );
    });

    it('replays a join-table rename chain verbatim (tags -> a -> b)', () => {
      const strapi = createStrapiMock({ metas: relMeta, schema: relSchema });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', { oldName: 'tags', newName: 'temp' });
      builder.addRenameAttribute('api::article.article', { oldName: 'temp', newName: 'labels' });

      const result = builder.build()!;
      const renames = [...result.content.matchAll(/renameTable\('([^']+)', '([^']+)'\)/g)].map(
        (m) => [m[1], m[2]]
      );
      expect(renames).toEqual([
        ['articles_tags_lnk', 'articles_temp_lnk'],
        ['articles_temp_lnk', 'articles_labels_lnk'],
      ]);
      expect(builder.getUnsupported()).toHaveLength(0);
    });
  });

  describe('filename + output format', () => {
    it('uses a full sortable timestamp in the filename (not just the year)', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });

      const result = builder.build()!;
      // e.g. 2026.06.11T15.39.50.123.rename-fields.js — full timestamp with ms,
      // must not collapse to 2026.rename-fields.js (which would collide between saves)
      expect(result.filename).not.toMatch(/^2026\.rename-fields\.js$/);
      expect(result.filename).toMatch(
        /^\d{4}\.\d{2}\.\d{2}T\d{2}\.\d{2}\.\d{2}\.\d{3}\.rename-fields\.js$/
      );
    });

    it('writeFiles never overwrites an existing migration with the same timestamp', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ctb-collide-'));
      const migrationsDir = path.join(tmp, 'database', 'migrations');
      const strapi = createStrapiMock({ metas: scalarMeta, migrationsDir });

      const buildOne = () => {
        const b = createMigrationBuilder({ strapi });
        b.addRenameAttribute('api::article.article', { oldName: 'oldTitle', newName: 'heading' });
        return b;
      };

      // Pre-seed a file occupying the deterministic name to force the collision path.
      const built = buildOne().build()!;
      fs.ensureDirSync(migrationsDir);
      fs.writeFileSync(path.join(migrationsDir, built.filename), '// existing');

      // Stabilise the timestamp so both builders would resolve the same filename.
      const spy = jest.spyOn(Date.prototype, 'toJSON').mockReturnValue('2026-01-01T00:00:00.000Z');
      const writtenPath = await buildOne().writeFiles();
      spy.mockRestore();

      expect(writtenPath).not.toBeNull();
      expect(fs.readFileSync(writtenPath as string, 'utf8')).not.toBe('// existing');
      expect(fs.readdirSync(migrationsDir)).toHaveLength(2);
      fs.removeSync(tmp);
    });

    it('emits JS (CommonJS module.exports)', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });

      const result = builder.build()!;
      expect(result.filename).toMatch(/\.rename-fields\.js$/);
      expect(result.content).toContain('module.exports');
    });

    it('always emits JS even when useTypescriptMigrations is enabled', () => {
      // The runner only globs `*.{js,sql}`, and the TS-migrations dir resolves to
      // the compiled output dir, so a `.ts` file would silently never run.
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ctb-ts-'));
      fs.writeFileSync(path.join(tmp, 'tsconfig.json'), '{}');
      const strapi = createStrapiMock({
        metas: scalarMeta,
        migrationsDir: path.join(tmp, 'database', 'migrations'),
        useTypescriptMigrations: true,
      });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });

      const result = builder.build()!;
      expect(result.filename).toMatch(/\.rename-fields\.js$/);
      expect(result.content).toContain('module.exports');
      expect(result.content).not.toContain('export default');
      fs.removeSync(tmp);
    });
  });

  describe('writeFiles', () => {
    it('creates the migrations dir if missing and writes one file', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ctb-write-'));
      const migrationsDir = path.join(tmp, 'database', 'migrations');
      const strapi = createStrapiMock({ metas: scalarMeta, migrationsDir });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });

      const written = await builder.writeFiles();

      expect(written).not.toBeNull();
      expect(fs.existsSync(migrationsDir)).toBe(true);
      const files = fs.readdirSync(migrationsDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/\.rename-fields\.js$/);
      const content = fs.readFileSync(path.join(migrationsDir, files[0]), 'utf8');
      expect(content).toContain("renameColumn('old_title', 'heading')");
      fs.removeSync(tmp);
    });

    it('writes nothing when there are no supported changes', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ctb-empty-'));
      const migrationsDir = path.join(tmp, 'database', 'migrations');
      const strapi = createStrapiMock({ metas: scalarMeta, migrationsDir });
      const builder = createMigrationBuilder({ strapi });

      const written = await builder.writeFiles();
      expect(written).toBeNull();
      expect(fs.existsSync(migrationsDir) ? fs.readdirSync(migrationsDir) : []).toHaveLength(0);
      fs.removeSync(tmp);
    });
  });
});

import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { snakeCase } from 'lodash/fp';

import { createMigrationBuilder, isCompatibleRename } from '..';

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

/**
 * Stand-in for `db.migrations.createFileBuilder()` that only records the
 * operations the CTB builder resolves. Rendering the migration file (and the
 * runtime guards) is the database package's responsibility and is tested there;
 * what matters here is *which* physical artifacts a rename resolves to.
 */
const createTestMigrationFileBuilder = ({ migrationsDir }: { migrationsDir?: string } = {}) => {
  const operations: Operation[] = [];

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
    getOperations(): Operation[] {
      return [...operations];
    },
    build({ name, format = 'javascript' }: { name: string; format?: 'javascript' | 'typescript' }) {
      if (operations.length === 0) {
        return null;
      }
      const extension = format === 'typescript' ? 'ts' : 'js';
      return {
        filename: `2026.01.01T00.00.00.000.${name}.${extension}`,
        content: JSON.stringify({ format, operations }),
      };
    },
    async writeFiles({
      name,
      dir,
      format,
    }: {
      name: string;
      dir?: string;
      format?: 'javascript' | 'typescript';
    }) {
      const built = this.build({ name, format });
      // Honor an explicit `dir` override (what the CTB passes), falling back to
      // the database-configured dir — mirroring the real file builder.
      const targetDir = dir ?? migrationsDir;
      if (!built || !targetDir) {
        return null;
      }

      fs.ensureDirSync(targetDir);
      const filePath = path.join(targetDir, built.filename);
      fs.writeFileSync(filePath, built.content, 'utf8');
      return filePath;
    },
  };
};

/**
 * Build a fake `strapi` with a metadata map + identifiers/naming, mirroring the
 * shape the real `strapi.db.metadata` exposes (see packages/core/database metadata).
 */
const createStrapiMock = ({
  metas = {},
  migrationsDir,
  appRoot,
  useTypescriptMigrations = false,
  naming,
  schema,
  customFields = {},
}: {
  metas?: Record<string, any>;
  migrationsDir?: string;
  appRoot?: string;
  useTypescriptMigrations?: boolean;
  naming?: Partial<Record<string, jest.Mock>>;
  // schema attribute descriptors per uid (the pre-reload `strapi.contentTypes`),
  // used by the builder to distinguish e.g. media from components/dynamic zones
  // that share the same morph-join-table metadata shape, to resolve which owners
  // reference a renamed component, and to detect type changes.
  // Merged over a schema derived from the metadata attributes.
  schema?: Record<string, Record<string, Record<string, unknown>>>;
  // registered custom fields by uid (`strapi.get('custom-fields')`)
  customFields?: Record<string, { type: string }>;
} = {}) => {
  const metadata = new Map<string, any>(Object.entries(metas));

  const namingRules = {
    // default: behave like a no-op shortener so identifiers are deterministic
    columnName: jest.fn((name: string) => snakeCase(name)),
    joinColumnName: jest.fn((name: string) => `${snakeCase(name)}_id`),
    joinTableName: jest.fn((table: string, name: string) => `${table}_${snakeCase(name)}_lnk`),
    ...naming,
  };

  (metadata as any).naming = namingRules;
  (metadata as any).identifiers = { FIELD_COLUMN: 'field' };

  const SCHEMA_KEYS = ['type', 'relation', 'target', 'component', 'repeatable'];
  const schemaFromMeta = (meta: any) =>
    Object.fromEntries(
      Object.entries(meta.attributes ?? {}).map(([name, attribute]: [string, any]) => [
        name,
        Object.fromEntries(
          SCHEMA_KEYS.filter((key) => key in attribute).map((k) => [k, attribute[k]])
        ),
      ])
    );

  const models: Record<string, { attributes: Record<string, unknown> }> = {};
  for (const [uid, meta] of Object.entries(metas)) {
    models[uid] = { attributes: schemaFromMeta(meta) };
  }
  for (const [uid, attrs] of Object.entries(schema ?? {})) {
    models[uid] = { attributes: { ...models[uid]?.attributes, ...attrs } };
  }

  const db = {
    metadata,
    config: {
      settings: {
        migrations: { dir: migrationsDir },
      },
    },
    migrations: {
      createFileBuilder: () => createTestMigrationFileBuilder({ migrationsDir }),
    },
  };

  return {
    contentTypes: models,
    components: {},
    db,
    config: {
      get: jest.fn((key: string) =>
        key === 'database.settings.useTypescriptMigrations' ? useTypescriptMigrations : undefined
      ),
    },
    dirs: {
      app: {
        root:
          appRoot ?? (migrationsDir ? path.dirname(path.dirname(migrationsDir)) : process.cwd()),
      },
    },
    get: jest.fn((name: string) =>
      name === 'custom-fields'
        ? {
            get(uid: string) {
              if (!customFields[uid]) {
                throw new Error(`Could not find Custom Field: ${uid}`);
              }
              return customFields[uid];
            },
          }
        : undefined
    ),
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

const scalarSchema = {
  'api::article.article': {
    oldTitle: { type: 'string' },
    summary: { type: 'text' },
  },
};

const columnRenamesOf = (builder: ReturnType<typeof createMigrationBuilder>): string[][] =>
  builder
    .getOperations()
    .filter((op) => op.kind === 'renameColumn')
    .map((op) => [(op as any).from, (op as any).to]);

const tableRenamesOf = (builder: ReturnType<typeof createMigrationBuilder>): string[][] =>
  builder
    .getOperations()
    .filter((op) => op.kind === 'renameTable')
    .map((op) => [(op as any).from, (op as any).to]);

describe('MigrationBuilder', () => {
  describe('addRenameAttribute + build', () => {
    it('resolves real identifiers (old columnName from metadata, new via naming rules)', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'newTitle',
      });

      expect(builder.getOperations()).toEqual([
        {
          kind: 'renameColumn',
          table: 'articles',
          from: 'old_title',
          to: 'new_title',
          comment: 'api::article.article: rename field "oldTitle" -> "newTitle"',
        },
      ]);
      // new column resolved via the shared naming rules (same as the metadata loader)
      expect(strapi.db.metadata.naming.columnName).toHaveBeenCalledWith('newTitle');
      expect(builder.build()).not.toBeNull();
    });

    it('uses the (possibly hashed) value returned by the naming rules verbatim for long names', () => {
      const columnName = jest.fn(() => 'a_very_long_field_name_th3f5a2');
      const strapi = createStrapiMock({
        metas: {
          'api::article.article': {
            tableName: 'articles',
            attributes: {
              old: { type: 'string', columnName: 'old_col' },
            },
          },
        },
        naming: { columnName },
      });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::article.article', {
        oldName: 'old',
        newName: 'aVeryLongFieldNameThatExceedsTheLimit',
      });

      expect(columnName).toHaveBeenCalledWith('aVeryLongFieldNameThatExceedsTheLimit');
      expect(columnRenamesOf(builder)).toEqual([['old_col', 'a_very_long_field_name_th3f5a2']]);
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

      expect(columnRenamesOf(builder)).toEqual([
        ['old_title', 'heading'],
        ['summary', 'excerpt'],
      ]);
      expect(builder.build()!.filename).toMatch(/\.rename-fields\.js$/);
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

  describe('type changes', () => {
    it('reports a hop whose type changed as unsupported and produces no operation', () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'views',
        newAttribute: { type: 'integer' },
      });

      expect(builder.hasChanges()).toBe(false);
      expect(builder.getUnsupported()).toEqual([
        {
          uid: 'api::article.article',
          oldName: 'oldTitle',
          newName: 'views',
          reason: 'type-changed',
        },
      ]);
    });

    it('accepts a hop whose new definition keeps the same type', () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
        newAttribute: { type: 'string', required: true },
      });

      expect(builder.getUnsupported()).toHaveLength(0);
      expect(columnRenamesOf(builder)).toEqual([['old_title', 'heading']]);
    });

    it('checks the end of a chain against the definition the chain started from', () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      // `tmp` is never a real attribute, so the intermediate hop carries no definition.
      builder.addRenameAttribute('api::article.article', { oldName: 'oldTitle', newName: 'tmp' });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'tmp',
        newName: 'views',
        newAttribute: { type: 'integer' },
      });

      expect(columnRenamesOf(builder)).toEqual([['old_title', 'tmp']]);
      expect(builder.getUnsupported()).toEqual([
        expect.objectContaining({ oldName: 'tmp', newName: 'views', reason: 'type-changed' }),
      ]);
    });

    it('does not block when the new definition is unknown', () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });

      expect(builder.getUnsupported()).toHaveLength(0);
      expect(builder.hasChanges()).toBe(true);
    });

    describe('isCompatibleRename', () => {
      it('requires the same type', () => {
        expect(isCompatibleRename({ type: 'string' }, { type: 'string' })).toBe(true);
        expect(isCompatibleRename({ type: 'string' }, { type: 'text' })).toBe(false);
        expect(isCompatibleRename({ type: 'string' }, { type: 'relation' })).toBe(false);
      });

      it('requires the same relation kind and target for relations', () => {
        const rel = { type: 'relation', relation: 'manyToMany', target: 'api::tag.tag' };
        expect(isCompatibleRename(rel, { ...rel })).toBe(true);
        expect(isCompatibleRename(rel, { ...rel, relation: 'oneToMany' })).toBe(false);
        expect(isCompatibleRename(rel, { ...rel, target: 'api::label.label' })).toBe(false);
      });

      it('requires the same component and repeatable flag for components', () => {
        const cmp = { type: 'component', component: 'default.hero', repeatable: false };
        expect(isCompatibleRename(cmp, { ...cmp })).toBe(true);
        expect(isCompatibleRename(cmp, { ...cmp, repeatable: true })).toBe(false);
        expect(isCompatibleRename(cmp, { ...cmp, component: 'default.banner' })).toBe(false);
      });

      it('is permissive when either definition is missing', () => {
        expect(isCompatibleRename(undefined, { type: 'integer' })).toBe(true);
        expect(isCompatibleRename({ type: 'string' }, undefined)).toBe(true);
      });

      it('requires the same direction for relations', () => {
        const manyWay = { type: 'relation', relation: 'oneToMany', target: 'api::tag.tag' };
        const bidirectional = { ...manyWay, targetAttribute: 'article' };

        // `manyWay` and a bidirectional `oneToMany` share `relation: 'oneToMany'`.
        expect(isCompatibleRename(manyWay, bidirectional)).toBe(false);
        expect(isCompatibleRename(bidirectional, manyWay)).toBe(false);
        // The live schema carries `inversedBy`, the payload `targetAttribute`.
        expect(isCompatibleRename({ ...manyWay, inversedBy: 'article' }, bidirectional)).toBe(true);
        expect(isCompatibleRename({ ...manyWay, mappedBy: 'articles' }, bidirectional)).toBe(true);
      });

      it('compares storage types through resolveType and requires the same custom field', () => {
        const resolveType = (attribute: { type?: string; customField?: string }) =>
          attribute.customField ? 'string' : attribute.type;
        const live = { type: 'string', customField: 'plugin::color.color' };
        const payload = { type: 'customField', customField: 'plugin::color.color' };

        expect(isCompatibleRename(live, payload)).toBe(false);
        expect(isCompatibleRename(live, payload, resolveType)).toBe(true);
        expect(
          isCompatibleRename(live, { ...payload, customField: 'plugin::other.field' }, resolveType)
        ).toBe(false);
        expect(isCompatibleRename({ type: 'string' }, payload, resolveType)).toBe(false);
      });
    });

    describe('custom fields', () => {
      const customFieldSchema = {
        'api::article.article': {
          oldTitle: { type: 'string', customField: 'plugin::color.color' },
        },
      };
      const customFields = {
        'plugin::color.color': { type: 'string' },
        'plugin::other.field': { type: 'string' },
      };

      it('accepts renaming a custom field sent as customField over its underlying type', () => {
        const strapi = createStrapiMock({
          metas: scalarMeta,
          schema: customFieldSchema,
          customFields,
        });
        const builder = createMigrationBuilder({ strapi });
        builder.addRenameAttribute('api::article.article', {
          oldName: 'oldTitle',
          newName: 'shade',
          newAttribute: { type: 'customField', customField: 'plugin::color.color' },
        });

        expect(builder.getUnsupported()).toHaveLength(0);
        expect(columnRenamesOf(builder)).toEqual([['old_title', 'shade']]);
      });

      it('refuses a switch to another custom field on the same underlying type', () => {
        const strapi = createStrapiMock({
          metas: scalarMeta,
          schema: customFieldSchema,
          customFields,
        });
        const builder = createMigrationBuilder({ strapi });
        builder.addRenameAttribute('api::article.article', {
          oldName: 'oldTitle',
          newName: 'shade',
          newAttribute: { type: 'customField', customField: 'plugin::other.field' },
        });

        expect(builder.getUnsupported()).toEqual([
          expect.objectContaining({ oldName: 'oldTitle', reason: 'type-changed' }),
        ]);
        expect(columnRenamesOf(builder)).toEqual([]);
      });
    });
  });

  describe('ordered-path replay (no synthetic temp columns)', () => {
    it("replays a user-routed swap verbatim using the user's own intermediate column", () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      // The CTB never lets two fields share a name, so a swap is performed by the
      // user as: oldTitle -> tmp, summary -> oldTitle, tmp -> summary.
      builder.addRenameAttribute('api::article.article', { oldName: 'oldTitle', newName: 'tmp' });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'summary',
        newName: 'oldTitle',
      });
      builder.addRenameAttribute('api::article.article', { oldName: 'tmp', newName: 'summary' });

      // Both live names are re-targeted only after an earlier hop vacated them.
      expect(builder.getUnsupported()).toHaveLength(0);
      // Verbatim, in order — no `strapi_tmp_` synthesized, no reordering.
      expect(columnRenamesOf(builder)).toEqual([
        ['old_title', 'tmp'],
        ['summary', 'old_title'],
        ['tmp', 'summary'],
      ]);
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

      expect(columnRenamesOf(builder)).toEqual([
        ['old_title', 'heading'],
        ['heading', 'final_title'],
      ]);
    });

    it('replays a -> c, b -> a, a -> b using each in-flight column', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'finalTitle',
      });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'summary',
        newName: 'oldTitle',
      });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'summary',
      });

      expect(columnRenamesOf(builder)).toEqual([
        ['old_title', 'final_title'],
        ['summary', 'old_title'],
        ['old_title', 'summary'],
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

      expect(columnRenamesOf(builder)).toEqual([
        ['old_title', 'heading'],
        ['heading', 'old_title'],
      ]);
    });

    it('handles a "shift" across two fields (a -> b, c -> a) without a temp column', () => {
      const shiftMeta = {
        'api::foo.foo': {
          tableName: 'foos',
          // `colB` is free (a live `colB` would make the first hop target-occupied).
          attributes: {
            colA: { type: 'string', columnName: 'col_a' },
            colC: { type: 'string', columnName: 'col_c' },
          },
        },
      };
      const strapi = createStrapiMock({ metas: shiftMeta });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute('api::foo.foo', { oldName: 'colA', newName: 'colB' });
      builder.addRenameAttribute('api::foo.foo', { oldName: 'colC', newName: 'colA' });

      expect(columnRenamesOf(builder)).toEqual([
        ['col_a', 'col_b'],
        ['col_c', 'col_a'],
      ]);
    });

    it('continues an in-flight chain even when an intermediate name is not a known attribute', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });

      // `tmp` is never a real attribute in metadata; it only exists mid-batch.
      builder.addRenameAttribute('api::article.article', { oldName: 'oldTitle', newName: 'tmp' });
      builder.addRenameAttribute('api::article.article', { oldName: 'tmp', newName: 'heading' });

      expect(builder.getUnsupported()).toHaveLength(0);
      expect(columnRenamesOf(builder)).toEqual([
        ['old_title', 'tmp'],
        ['tmp', 'heading'],
      ]);
    });
  });

  describe('target still occupied', () => {
    const uid = 'api::article.article';

    it('refuses a hop whose target is still live and nothing vacated it', () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute(uid, { oldName: 'oldTitle', newName: 'summary' });

      expect(builder.hasChanges()).toBe(false);
      expect(builder.getUnsupported()).toEqual([
        { uid, oldName: 'oldTitle', newName: 'summary', reason: 'target-occupied' },
      ]);
    });

    it('refuses the tail of a truncated swap (tmp -> b while b is live)', () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      // A client that sent only the last hop of `oldTitle -> tmp, summary ->
      // oldTitle, tmp -> summary` would collide with the live `summary` column.
      builder.addRenameAttribute(uid, { oldName: 'tmp', newName: 'summary' });

      expect(builder.hasChanges()).toBe(false);
      expect(builder.getUnsupported()).toEqual([
        { uid, oldName: 'tmp', newName: 'summary', reason: 'target-occupied' },
      ]);
    });

    it('refuses the accepted tail of a partially accepted swap', () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      // `summary -> oldTitle` was dropped from the middle of the swap; `summary`
      // is therefore still live when `tmp -> summary` runs.
      builder.addRenameAttribute(uid, { oldName: 'oldTitle', newName: 'tmp' });
      builder.addRenameAttribute(uid, { oldName: 'tmp', newName: 'summary' });

      expect(columnRenamesOf(builder)).toEqual([['old_title', 'tmp']]);
      expect(builder.getUnsupported()).toEqual([
        { uid, oldName: 'tmp', newName: 'summary', reason: 'target-occupied' },
      ]);
    });

    it('refuses a hop targeting a name produced by an earlier hop still in flight', () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute(uid, { oldName: 'oldTitle', newName: 'heading' });
      builder.addRenameAttribute(uid, { oldName: 'summary', newName: 'heading' });

      expect(columnRenamesOf(builder)).toEqual([['old_title', 'heading']]);
      expect(builder.getUnsupported()).toEqual([
        { uid, oldName: 'summary', newName: 'heading', reason: 'target-occupied' },
      ]);
    });

    it('keeps a chain unsupported after a target-occupied hop', () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute(uid, { oldName: 'tmp', newName: 'summary' });
      builder.addRenameAttribute(uid, { oldName: 'summary', newName: 'finalTitle' });

      expect(builder.hasChanges()).toBe(false);
      expect(builder.getUnsupported()).toEqual([
        { uid, oldName: 'tmp', newName: 'summary', reason: 'target-occupied' },
        { uid, oldName: 'summary', newName: 'finalTitle', reason: 'target-occupied' },
      ]);
    });

    it('allows a target that an earlier hop vacated (a -> b, c -> a)', () => {
      const strapi = createStrapiMock({
        metas: scalarMeta,
        schema: scalarSchema,
      });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute(uid, { oldName: 'oldTitle', newName: 'heading' });
      builder.addRenameAttribute(uid, { oldName: 'summary', newName: 'oldTitle' });

      expect(builder.getUnsupported()).toHaveLength(0);
      expect(columnRenamesOf(builder)).toEqual([
        ['old_title', 'heading'],
        ['summary', 'old_title'],
      ]);
    });

    it('does not vacate the source of a hop refused as type-changed', () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      // oldTitle -> views changes the type, so old_title stays live until sync drops it.
      builder.addRenameAttribute(uid, {
        oldName: 'oldTitle',
        newName: 'views',
        newAttribute: { type: 'integer' },
      });
      builder.addRenameAttribute(uid, { oldName: 'summary', newName: 'oldTitle' });

      expect(builder.getUnsupported()).toEqual([
        { uid, oldName: 'oldTitle', newName: 'views', reason: 'type-changed' },
        { uid, oldName: 'summary', newName: 'oldTitle', reason: 'target-occupied' },
      ]);
      expect(columnRenamesOf(builder)).toEqual([]);
    });

    it('keeps the source of a refused continuation hop occupied (a -> b, b -> c refused, x -> b)', () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute(uid, { oldName: 'oldTitle', newName: 'heading' });
      builder.addRenameAttribute(uid, {
        oldName: 'heading',
        newName: 'views',
        newAttribute: { type: 'integer' },
      });
      builder.addRenameAttribute(uid, { oldName: 'summary', newName: 'heading' });

      expect(builder.getUnsupported()).toEqual([
        { uid, oldName: 'heading', newName: 'views', reason: 'type-changed' },
        { uid, oldName: 'summary', newName: 'heading', reason: 'target-occupied' },
      ]);
      expect(columnRenamesOf(builder)).toEqual([['old_title', 'heading']]);
    });

    it('does not vacate the source of a hop refused as target-occupied', () => {
      const strapi = createStrapiMock({ metas: scalarMeta, schema: scalarSchema });
      const builder = createMigrationBuilder({ strapi });

      builder.addRenameAttribute(uid, { oldName: 'oldTitle', newName: 'summary' });
      builder.addRenameAttribute(uid, { oldName: 'summary', newName: 'oldTitle' });

      expect(builder.getUnsupported()).toEqual([
        { uid, oldName: 'oldTitle', newName: 'summary', reason: 'target-occupied' },
        { uid, oldName: 'summary', newName: 'oldTitle', reason: 'target-occupied' },
      ]);
      expect(columnRenamesOf(builder)).toEqual([]);
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

      expect(builder.getOperations()).toEqual([
        expect.objectContaining({
          kind: 'renameColumn',
          table: 'articles',
          from: 'category_id',
          to: 'section_id',
        }),
      ]);
      expect(strapi.db.metadata.naming.joinColumnName).toHaveBeenCalledWith('section');
      expect(builder.getUnsupported()).toHaveLength(0);
    });

    it('renames a relation join/link table', () => {
      const strapi = createStrapiMock({ metas: relMeta, schema: relSchema });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', { oldName: 'tags', newName: 'labels' });

      expect(tableRenamesOf(builder)).toEqual([['articles_tags_lnk', 'articles_labels_lnk']]);
      expect(strapi.db.metadata.naming.joinTableName).toHaveBeenCalledWith('articles', 'labels');
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

      expect(builder.getOperations()).toEqual([
        expect.objectContaining({
          kind: 'updateRows',
          table: 'articles_cmps',
          guardColumn: 'field',
          where: { field: 'hero' },
          set: { field: 'banner' },
        }),
        expect.objectContaining({
          kind: 'updateRows',
          table: 'articles_cmps',
          guardColumn: 'field',
          where: { field: 'blocks' },
          set: { field: 'sections' },
        }),
      ]);
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

      expect(builder.getOperations()).toEqual([
        expect.objectContaining({
          kind: 'updateRows',
          table: 'files_related_morphs',
          guardColumn: 'field',
          where: { field: 'cover', related_type: 'api::article.article' },
          set: { field: 'image' },
        }),
      ]);
      expect(builder.getUnsupported()).toHaveLength(0);
    });

    it('treats a field on the shared upload morph table as media even without a schema type', () => {
      // Hardening: if the schema-type lookup is unavailable, a media field must
      // still be detected (and scoped by related_type) rather than falling into
      // the unscoped component branch and corrupting other types' media.
      const strapi = createStrapiMock({ metas: relMeta /* no schema provided */ });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', { oldName: 'cover', newName: 'image' });

      expect(builder.getOperations()).toEqual([
        expect.objectContaining({
          table: 'files_related_morphs',
          where: { field: 'cover', related_type: 'api::article.article' },
        }),
      ]);
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

      expect(tableRenamesOf(builder)).toEqual([
        ['articles_tags_lnk', 'articles_temp_lnk'],
        ['articles_temp_lnk', 'articles_labels_lnk'],
      ]);
      expect(builder.getUnsupported()).toHaveLength(0);
    });

    it('refuses a relation rename that also retargets the relation', () => {
      const strapi = createStrapiMock({
        metas: relMeta,
        schema: {
          'api::article.article': {
            tags: { type: 'relation', relation: 'manyToMany', target: 'api::tag.tag' },
          },
        },
      });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'tags',
        newName: 'labels',
        newAttribute: { type: 'relation', relation: 'manyToMany', target: 'api::label.label' },
      });

      expect(builder.hasChanges()).toBe(false);
      expect(builder.getUnsupported()).toEqual([
        expect.objectContaining({ oldName: 'tags', reason: 'type-changed' }),
      ]);
    });
  });

  describe('system and non-configurable attributes', () => {
    const systemMeta = {
      'api::article.article': {
        tableName: 'articles',
        attributes: {
          title: { type: 'string', columnName: 'title' },
          documentId: { type: 'string', columnName: 'document_id' },
          createdBy: {
            type: 'relation',
            relation: 'oneToOne',
            joinColumn: { name: 'created_by_id' },
          },
          locale: { type: 'string', columnName: 'locale' },
          internal: { type: 'string', columnName: 'internal' },
          // inverse side of a bidirectional join-column relation
          profile: {
            type: 'relation',
            relation: 'oneToOne',
            mappedBy: 'article',
            joinColumn: { name: 'id' },
          },
        },
      },
    };
    const systemSchema = {
      'api::article.article': {
        title: { type: 'string' },
        documentId: { type: 'string' },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          visible: false,
        },
        locale: { type: 'string', configurable: false, visible: false },
        internal: { type: 'string', configurable: false },
        profile: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::profile.profile',
          mappedBy: 'article',
        },
      },
    };

    it.each(['documentId', 'createdBy', 'locale', 'internal'])(
      'refuses to rename %s and emits no operation',
      (oldName) => {
        const strapi = createStrapiMock({ metas: systemMeta, schema: systemSchema });
        const builder = createMigrationBuilder({ strapi });
        builder.addRenameAttribute('api::article.article', { oldName, newName: 'renamed' });

        expect(builder.getUnsupported()).toEqual([
          expect.objectContaining({ oldName, reason: 'unsupported-type' }),
        ]);
        expect(builder.getOperations()).toEqual([]);
      }
    );

    it('refuses an attribute that is in the metadata but not in the schema', () => {
      const strapi = createStrapiMock({ metas: systemMeta, schema: systemSchema });
      (strapi.contentTypes['api::article.article'].attributes as any).title = undefined;
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', { oldName: 'title', newName: 'heading' });

      expect(builder.getUnsupported()).toEqual([
        expect.objectContaining({ oldName: 'title', reason: 'attribute-not-found' }),
      ]);
      expect(builder.getOperations()).toEqual([]);
    });

    it('skips the inverse side of a join-column relation (it owns no column)', () => {
      const strapi = createStrapiMock({ metas: systemMeta, schema: systemSchema });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', { oldName: 'profile', newName: 'bio' });

      expect(builder.getUnsupported()).toHaveLength(0);
      expect(builder.getOperations()).toEqual([]);
    });
  });

  describe('chains that reuse a name', () => {
    const chainMeta = {
      'api::article.article': {
        tableName: 'articles',
        attributes: {
          oldTitle: { type: 'string', columnName: 'old_title' },
          views: { type: 'integer', columnName: 'views' },
        },
      },
    };

    it('checks each hop against the definition of the field it produces', () => {
      const strapi = createStrapiMock({ metas: chainMeta });
      const builder = createMigrationBuilder({ strapi });

      // What the schema service sends for `a -> b, b -> c, x -> b`: only the last
      // hop onto `heading` carries `heading`'s final (integer) definition.
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'heading',
        newName: 'summary2',
        newAttribute: { type: 'string' },
      });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'views',
        newName: 'heading',
        newAttribute: { type: 'integer' },
      });

      expect(builder.getUnsupported()).toHaveLength(0);
      expect(columnRenamesOf(builder)).toEqual([
        ['old_title', 'heading'],
        ['heading', 'summary_2'],
        ['views', 'heading'],
      ]);
    });
  });

  describe('output format', () => {
    it('emits JavaScript by default', () => {
      const strapi = createStrapiMock({ metas: scalarMeta });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });

      const result = builder.build()!;
      expect(result.filename).toMatch(/\.rename-fields\.js$/);
      expect(JSON.parse(result.content).format).toBe('javascript');
      expect(strapi.log.warn).not.toHaveBeenCalled();
    });

    it('emits TypeScript when useTypescriptMigrations is enabled and discovery reads from dist', () => {
      // With `useTypescriptMigrations` and a resolvable tsconfig `outDir` the
      // database discovers migrations from the compiled output dir and the
      // app's tsconfig does not compile `.js` sources, so a `.js` file would
      // silently never run.
      const strapi = createStrapiMock({
        metas: scalarMeta,
        useTypescriptMigrations: true,
        appRoot: '/app',
        migrationsDir: '/app/dist/database/migrations',
      });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });

      const result = builder.build()!;
      expect(strapi.config.get).toHaveBeenCalledWith('database.settings.useTypescriptMigrations');
      expect(result.filename).toMatch(/\.rename-fields\.ts$/);
      expect(JSON.parse(result.content).format).toBe('typescript');
      expect(strapi.log.warn).not.toHaveBeenCalled();
    });

    it('falls back to JavaScript when the flag is on but discovery reads the source dir', () => {
      // A JS app (no tsconfig) or a TS app without an `outDir`: `Strapi.ts`
      // keeps discovery on the source dir, which only loads `.js`, so a `.ts`
      // file would never be compiled or run.
      const strapi = createStrapiMock({
        metas: scalarMeta,
        useTypescriptMigrations: true,
        appRoot: '/app',
        migrationsDir: '/app/database/migrations',
      });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });

      const result = builder.build()!;
      expect(result.filename).toMatch(/\.rename-fields\.js$/);
      expect(JSON.parse(result.content).format).toBe('javascript');
      expect(strapi.log.warn).toHaveBeenCalledTimes(1);
      expect(strapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('useTypescriptMigrations')
      );

      // The decision is memoised: a second call does not warn again.
      builder.build();
      expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    });

    it('falls back to JavaScript when the database has no migrations dir configured', () => {
      const strapi = createStrapiMock({
        metas: scalarMeta,
        useTypescriptMigrations: true,
        migrationsDir: undefined,
      });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });

      const result = builder.build()!;
      expect(result.filename).toMatch(/\.rename-fields\.js$/);
      expect(JSON.parse(result.content).format).toBe('javascript');
      expect(strapi.log.warn).toHaveBeenCalledTimes(1);
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

    it('writes a .ts file to the app source dir (not the dist dir) when useTypescriptMigrations is enabled', async () => {
      // With `useTypescriptMigrations` the database's configured migrations dir
      // resolves to build output (e.g. `dist/database/migrations`), which is
      // gitignored and wiped on rebuild. The generated migration must instead
      // land in the app's source `database/migrations` as a `.ts` file so `tsc`
      // compiles it into `dist`, where discovery looks.
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ctb-src-dir-'));
      const distMigrationsDir = path.join(tmp, 'dist', 'database', 'migrations');
      const sourceMigrationsDir = path.join(tmp, 'database', 'migrations');
      const strapi = createStrapiMock({
        metas: scalarMeta,
        migrationsDir: distMigrationsDir,
        appRoot: tmp,
        useTypescriptMigrations: true,
      });
      const builder = createMigrationBuilder({ strapi });
      builder.addRenameAttribute('api::article.article', {
        oldName: 'oldTitle',
        newName: 'heading',
      });

      const written = await builder.writeFiles();

      expect(written).not.toBeNull();
      expect(written as string).toContain(sourceMigrationsDir);
      expect(written).toMatch(/\.rename-fields\.ts$/);
      expect(fs.readdirSync(sourceMigrationsDir)).toHaveLength(1);
      expect(fs.existsSync(distMigrationsDir)).toBe(false);
      fs.removeSync(tmp);
    });
  });
});

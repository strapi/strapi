import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  runInServer,
  scaffoldContentType,
  scaffoldServerScript,
  stopAllServers,
} from '@strapi/tests-shared';

import { setupApp, type TestApp } from '../../helpers';

interface Column {
  name: string;
  type: string;
  args: unknown[];
  notNullable: boolean;
}

interface Index {
  name: string;
  columns: string[];
  type?: string;
}

interface ForeignKey {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onUpdate: string | null;
  onDelete: string | null;
}

interface Schema {
  tables: Array<{ name: string; columns: Column[]; indexes: Index[] }>;
}

interface Tables {
  articleTable: string;
  categoryTable: string;
  linkTable: string;
}

let ctx: TestApp;
let tables: Tables;

const inspect = <T>(action: string, args?: Record<string, unknown>) =>
  runInServer<T>(ctx.server, 'schema-inspector', action, args);

describe('SchemaInspector (integration)', () => {
  beforeAll(async () => {
    ctx = await setupApp({
      name: 'db-schema-inspector',
      scaffold(app) {
        scaffoldContentType(app, {
          displayName: 'inspector_category',
          singularName: 'inspector-category',
          pluralName: 'inspector-categories',
          attributes: { title: { type: 'string' } },
        });
        scaffoldContentType(app, {
          displayName: 'inspector_article',
          singularName: 'inspector-article',
          pluralName: 'inspector-articles',
          attributes: {
            slug: { type: 'string', unique: true },
            body: { type: 'text' },
            published: { type: 'boolean' },
            category: {
              type: 'relation',
              relation: 'manyToOne',
              target: 'api::inspector-category.inspector-category',
            },
          },
        });
        scaffoldServerScript(app, path.join(__dirname, 'server/schema-inspector.js'));
      },
    });
    tables = await inspect<Tables>('tables');
  });

  afterAll(stopAllServers);

  test('getSchema returns every known content-type table with columns', async () => {
    const schema = await inspect<Schema>('getSchema');

    const { articleTable, categoryTable } = tables;

    const tableNames = schema.tables.map((t) => t.name);
    expect(tableNames).toEqual(expect.arrayContaining([articleTable, categoryTable]));

    const article = schema.tables.find((t) => t.name === articleTable)!;
    const columnNames = article.columns.map((c) => c.name);
    expect(columnNames).toEqual(expect.arrayContaining(['id', 'slug', 'body', 'published']));

    // id column: NOT NULL across all dialects
    const idCol = article.columns.find((c) => c.name === 'id')!;
    expect(idCol.notNullable).toBe(true);

    // boolean / text columns map to the same Strapi types across all dialects
    const publishedCol = article.columns.find((c) => c.name === 'published')!;
    expect(publishedCol.type).toBe('boolean');

    const bodyCol = article.columns.find((c) => c.name === 'body')!;
    expect(bodyCol.type).toBe('text');
    expect(bodyCol.args).toEqual(['longtext']);
  });

  test('foreign keys from the article<->category link table are reported', async () => {
    // Strapi v5 stores manyToOne relations in a join/link table, not as a
    // direct FK on the source table — assert against that link table.
    const { articleTable, categoryTable, linkTable } = tables;

    const fks = await inspect<ForeignKey[]>('getForeignKeys', { table: linkTable });

    const articleFk = fks.find((fk) => fk.referencedTable === articleTable);
    const categoryFk = fks.find((fk) => fk.referencedTable === categoryTable)!;

    expect(articleFk).toBeDefined();
    expect(categoryFk).toBeDefined();
    expect(categoryFk.columns.length).toBeGreaterThan(0);
    expect(categoryFk.referencedColumns).toContain('id');
    // on_update / on_delete come back uppercased by the inspector
    if (categoryFk.onUpdate !== null) {
      expect(categoryFk.onUpdate).toBe(categoryFk.onUpdate.toUpperCase());
    }
    if (categoryFk.onDelete !== null) {
      expect(categoryFk.onDelete).toBe(categoryFk.onDelete.toUpperCase());
    }
  });

  test('getSchema and getIndexes return consistent index data for the same table', async () => {
    const { articleTable } = tables;

    const schema = await inspect<Schema>('getSchema');
    const fromSchema = schema.tables.find((t) => t.name === articleTable)!.indexes;
    const fromSingle = await inspect<Index[]>('getIndexes', { table: articleTable });

    const normalize = (indexes: Index[]) =>
      indexes
        .map((i) => ({ name: i.name, columns: [...i.columns].sort(), type: i.type }))
        .sort((a, b) => a.name.localeCompare(b.name));

    expect(normalize(fromSchema)).toEqual(normalize(fromSingle));
  });

  test('getSchema groups columns per-table without leaking across tables', async () => {
    // Covers the per-table grouping logic that the bulk inspector implementations
    // rely on: `slug` lives only on article, `title` lives only on category, so
    // a grouping bug would surface them on the wrong table.
    const schema = await inspect<Schema>('getSchema');

    const { articleTable, categoryTable } = tables;

    const article = schema.tables.find((t) => t.name === articleTable)!;
    const category = schema.tables.find((t) => t.name === categoryTable)!;

    const articleColNames = new Set(article.columns.map((c) => c.name));
    const categoryColNames = new Set(category.columns.map((c) => c.name));

    expect(articleColNames.has('slug')).toBe(true);
    expect(articleColNames.has('title')).toBe(false);
    expect(categoryColNames.has('title')).toBe(true);
    expect(categoryColNames.has('slug')).toBe(false);
  });

  test('composite foreign keys are reported with every column in the constraint', async () => {
    const { parent, fks } = await inspect<{ parent: string; fks: ForeignKey[] }>(
      'compositeForeignKeys'
    );
    const compositeFk = fks.find((fk) => fk.referencedTable === parent)!;

    expect(compositeFk).toBeDefined();
    expect(compositeFk.columns).toEqual(expect.arrayContaining(['pa', 'pb']));
    expect(compositeFk.referencedColumns).toEqual(expect.arrayContaining(['a', 'b']));
    expect(compositeFk.columns).toHaveLength(2);
    expect(compositeFk.referencedColumns).toHaveLength(2);
  });
});

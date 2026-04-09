'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const categoryCT = {
  displayName: 'inspector_category',
  singularName: 'inspector-category',
  pluralName: 'inspector-categories',
  kind: 'collectionType',
  attributes: {
    title: { type: 'string' },
  },
};

const articleCT = {
  displayName: 'inspector_article',
  singularName: 'inspector-article',
  pluralName: 'inspector-articles',
  kind: 'collectionType',
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
};

const builder = createTestBuilder();
/** @type {import('@strapi/types').Core.Strapi} */
let strapi;
/** @type {import('@strapi/types').Core.Strapi['db']['dialect']['schemaInspector']} */
let schemaInspector;

describe('SchemaInspector (integration)', () => {
  beforeAll(async () => {
    await builder.addContentTypes([categoryCT, articleCT]).build();
    strapi = await createStrapiInstance();
    schemaInspector = strapi.db.dialect.schemaInspector;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('getSchema returns every known content-type table with columns', async () => {
    const schema = await schemaInspector.getSchema();

    const articleTable = strapi.db.metadata.get(
      'api::inspector-article.inspector-article'
    ).tableName;
    const categoryTable = strapi.db.metadata.get(
      'api::inspector-category.inspector-category'
    ).tableName;

    const tableNames = schema.tables.map((t) => t.name);
    expect(tableNames).toEqual(expect.arrayContaining([articleTable, categoryTable]));

    const article = schema.tables.find((t) => t.name === articleTable);
    const columnNames = article.columns.map((c) => c.name);
    expect(columnNames).toEqual(expect.arrayContaining(['id', 'slug', 'body', 'published']));

    // id column: NOT NULL across all dialects
    const idCol = article.columns.find((c) => c.name === 'id');
    expect(idCol.notNullable).toBe(true);

    // boolean / text columns map to the same Strapi types across all dialects
    const publishedCol = article.columns.find((c) => c.name === 'published');
    expect(publishedCol.type).toBe('boolean');

    const bodyCol = article.columns.find((c) => c.name === 'body');
    expect(bodyCol.type).toBe('text');
    expect(bodyCol.args).toEqual(['longtext']);
  });

  test('foreign keys from the article<->category link table are reported', async () => {
    // Strapi v5 stores manyToOne relations in a join/link table, not as a
    // direct FK on the source table — assert against that link table.
    const articleMeta = strapi.db.metadata.get('api::inspector-article.inspector-article');
    const articleTable = articleMeta.tableName;
    const categoryTable = strapi.db.metadata.get(
      'api::inspector-category.inspector-category'
    ).tableName;
    const linkTable = articleMeta.attributes.category.joinTable.name;

    const fks = await schemaInspector.getForeignKeys(linkTable);

    const articleFk = fks.find((fk) => fk.referencedTable === articleTable);
    const categoryFk = fks.find((fk) => fk.referencedTable === categoryTable);

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
    const articleTable = strapi.db.metadata.get(
      'api::inspector-article.inspector-article'
    ).tableName;

    const schema = await schemaInspector.getSchema();
    const fromSchema = schema.tables.find((t) => t.name === articleTable).indexes;
    const fromSingle = await schemaInspector.getIndexes(articleTable);

    const normalize = (indexes) =>
      indexes
        .map((i) => ({ name: i.name, columns: [...i.columns].sort(), type: i.type }))
        .sort((a, b) => a.name.localeCompare(b.name));

    expect(normalize(fromSchema)).toEqual(normalize(fromSingle));
  });
});

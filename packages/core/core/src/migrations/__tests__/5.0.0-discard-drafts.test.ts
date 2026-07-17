import type { Database } from '@strapi/database';
import { createConnection } from '@strapi/database/src/connection';

import { discardDocumentDrafts } from '../database/5.0.0-discard-drafts';

const ARTICLE_UID = 'api::article.article';
const TAG_UID = 'api::tag.tag';
const JOIN_TABLE = 'tags_articles_links';

const i18nLocalizationsAttribute = {
  type: 'relation',
  relation: 'oneToMany',
  target: ARTICLE_UID,
  unstable_virtual: true,
  joinColumn: {
    name: 'document_id',
    referencedColumn: 'document_id',
    referencedTable: 'articles',
  },
};

const tagToArticleJoinTable = {
  name: JOIN_TABLE,
  joinColumn: {
    name: 'tag_id',
    referencedColumn: 'id',
    referencedTable: 'tags',
  },
  inverseJoinColumn: {
    name: 'article_id',
    referencedColumn: 'id',
    referencedTable: 'articles',
  },
  orderColumnName: 'tag_order',
  orderBy: { tag_order: 'asc' },
  inverseOrderColumnName: 'article_order',
};

const articleToTagJoinTable = {
  name: JOIN_TABLE,
  joinColumn: {
    name: 'article_id',
    referencedColumn: 'id',
    referencedTable: 'articles',
  },
  inverseJoinColumn: {
    name: 'tag_id',
    referencedColumn: 'id',
    referencedTable: 'tags',
  },
  orderColumnName: 'article_order',
  orderBy: { article_order: 'asc' },
  inverseOrderColumnName: 'tag_order',
};

const articleAttributesBase = {
  documentId: { type: 'string', columnName: 'document_id' },
  title: { type: 'string', columnName: 'title' },
  publishedAt: { type: 'datetime', columnName: 'published_at' },
  createdAt: { type: 'datetime', columnName: 'created_at' },
  updatedAt: { type: 'datetime', columnName: 'updated_at' },
  locale: { type: 'string', columnName: 'locale' },
  localizations: i18nLocalizationsAttribute,
  createdBy: {
    type: 'relation',
    relation: 'oneToOne',
    target: 'admin::user',
    joinColumn: { name: 'created_by_id', referencedColumn: 'id' },
  },
  updatedBy: {
    type: 'relation',
    relation: 'oneToOne',
    target: 'admin::user',
    joinColumn: { name: 'updated_by_id', referencedColumn: 'id' },
  },
};

const articleAttributes = {
  ...articleAttributesBase,
  tags: {
    type: 'relation',
    relation: 'manyToMany',
    target: TAG_UID,
    mappedBy: 'articles',
    joinTable: articleToTagJoinTable,
  },
};

const tagAttributes = {
  documentId: { type: 'string', columnName: 'document_id' },
  name: { type: 'string', columnName: 'name' },
  articles: {
    type: 'relation',
    relation: 'manyToMany',
    target: ARTICLE_UID,
    inversedBy: 'tags',
    joinTable: tagToArticleJoinTable,
  },
};

const articleOwnsTagsAttributes = {
  ...articleAttributesBase,
  tags: {
    type: 'relation',
    relation: 'manyToMany',
    target: TAG_UID,
    inversedBy: 'articles',
    joinTable: articleToTagJoinTable,
  },
};

const tagMappedByAttributes = {
  ...tagAttributes,
  articles: {
    type: 'relation',
    relation: 'manyToMany',
    target: ARTICLE_UID,
    mappedBy: 'tags',
    joinTable: articleToTagJoinTable,
  },
};

const articleMeta = {
  uid: ARTICLE_UID,
  tableName: 'articles',
  singularName: 'article',
  attributes: articleAttributes,
};

const tagMeta = {
  uid: TAG_UID,
  tableName: 'tags',
  singularName: 'tag',
  attributes: tagAttributes,
};

const adminUserMeta = {
  uid: 'admin::user',
  tableName: 'admin_users',
  singularName: 'user',
  attributes: {
    id: { type: 'increments', columnName: 'id' },
  },
};

const buildMigrationDb = (
  options: { includeTags?: boolean; articleAttributes?: typeof articleAttributes } = {}
): Database => {
  const attributes = options.articleAttributes ?? articleAttributes;
  const meta = { ...articleMeta, attributes };

  return {
    metadata: {
      get(uid: string) {
        if (uid === ARTICLE_UID) {
          return meta;
        }
        if (options.includeTags && uid === TAG_UID) {
          return tagMeta;
        }
        if (uid === 'admin::user') {
          return adminUserMeta;
        }
        return null;
      },
      values: () => (options.includeTags ? [meta, tagMeta] : [meta]),
    },
    dialect: {
      getBatchInsertSize: () => 500,
    },
  } as unknown as Database;
};

const setupStrapi = (
  db: Database,
  options: { includeTags?: boolean; articleAttributes?: typeof articleAttributes } = {}
) => {
  const attributes = options.articleAttributes ?? articleAttributes;

  global.strapi = {
    log: { info: jest.fn(), warn: jest.fn() },
    getModel(uid: string) {
      if (uid === ARTICLE_UID) {
        return {
          uid: ARTICLE_UID,
          options: { draftAndPublish: true },
          attributes,
        };
      }
      if (options.includeTags && uid === TAG_UID) {
        return {
          uid: TAG_UID,
          options: {},
          attributes: tagAttributes,
        };
      }
      if (uid === 'admin::user') {
        return {
          uid: 'admin::user',
          options: {},
          attributes: adminUserMeta.attributes,
        };
      }
      return null;
    },
    contentTypes: {
      [ARTICLE_UID]: {
        uid: ARTICLE_UID,
        options: { draftAndPublish: true },
        attributes,
      },
      ...(options.includeTags
        ? {
            [TAG_UID]: {
              uid: TAG_UID,
              options: {},
              attributes: tagAttributes,
            },
          }
        : {}),
    },
    components: {},
    plugins: {},
    db,
    plugin: () => undefined,
  } as any;
};

const buildArticleOwnsTagsMigrationDb = (): Database => {
  const articleMetaOwns = { ...articleMeta, attributes: articleOwnsTagsAttributes };
  const tagMetaMapped = { ...tagMeta, attributes: tagMappedByAttributes };

  return {
    metadata: {
      get(uid: string) {
        if (uid === ARTICLE_UID) {
          return articleMetaOwns;
        }
        if (uid === TAG_UID) {
          return tagMetaMapped;
        }
        if (uid === 'admin::user') {
          return adminUserMeta;
        }
        return null;
      },
      values: () => [articleMetaOwns, tagMetaMapped],
    },
    dialect: {
      getBatchInsertSize: () => 500,
    },
  } as unknown as Database;
};

const setupArticleOwnsTagsStrapi = (db: Database) => {
  global.strapi = {
    log: { info: jest.fn(), warn: jest.fn() },
    getModel(uid: string) {
      if (uid === ARTICLE_UID) {
        return {
          uid: ARTICLE_UID,
          options: { draftAndPublish: true },
          attributes: articleOwnsTagsAttributes,
        };
      }
      if (uid === TAG_UID) {
        return {
          uid: TAG_UID,
          options: {},
          attributes: tagMappedByAttributes,
        };
      }
      if (uid === 'admin::user') {
        return {
          uid: 'admin::user',
          options: {},
          attributes: adminUserMeta.attributes,
        };
      }
      return null;
    },
    contentTypes: {
      [ARTICLE_UID]: {
        uid: ARTICLE_UID,
        options: { draftAndPublish: true },
        attributes: articleOwnsTagsAttributes,
      },
      [TAG_UID]: {
        uid: TAG_UID,
        options: {},
        attributes: tagMappedByAttributes,
      },
    },
    components: {},
    plugins: {},
    db,
    plugin: () => undefined,
  } as any;
};

type KnexConnection = ReturnType<typeof createConnection>;

const runDiscardDraftsMigration = async (knexConnection: KnexConnection, db: Database) => {
  await knexConnection.transaction(async (trx) => {
    await discardDocumentDrafts.up(trx, db);
  });
};

const getDraftArticleTagOrder = async (knexConnection: KnexConnection) => {
  const draftArticle = await knexConnection('articles').whereNull('published_at').first();

  return knexConnection(JOIN_TABLE)
    .where({ article_id: draftArticle.id })
    .orderBy('article_order', 'asc')
    .select('tag_id', 'article_order');
};

describe('5.0.0-discard-drafts migration', () => {
  const knexConnection = createConnection({
    client: 'sqlite',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });

  beforeAll(async () => {
    await knexConnection.schema.createTable('articles', (table) => {
      table.increments('id');
      table.string('document_id');
      table.string('title');
      table.bigInteger('published_at');
      table.string('locale');
      table.bigInteger('created_at');
      table.bigInteger('updated_at');
      table.integer('created_by_id');
      table.integer('updated_by_id');
    });

    setupStrapi(buildMigrationDb());
  });

  afterAll(async () => {
    await knexConnection.destroy();
  });

  describe('copyPublishedEntriesToDraft', () => {
    beforeEach(async () => {
      await knexConnection('articles').delete();
      await knexConnection('articles').insert({
        id: 1,
        document_id: 'doc1',
        title: 'test1',
        published_at: 1779746177147,
        created_at: 1,
        updated_at: 1,
        created_by_id: 1,
        updated_by_id: 1,
      });
    });

    it('copies join-column creator fields onto cloned draft rows (with i18n localizations virtual relation)', async () => {
      const db = buildMigrationDb({ articleAttributes: articleAttributesBase });
      setupStrapi(db, { articleAttributes: articleAttributesBase });

      await knexConnection.transaction(async (trx) => {
        await discardDocumentDrafts.up(trx, db);
      });

      const published = await knexConnection('articles').whereNotNull('published_at').first();
      const draft = await knexConnection('articles').whereNull('published_at').first();

      expect(published?.created_by_id).toBe(1);
      expect(published?.updated_by_id).toBe(1);
      expect(draft?.document_id).toBe('doc1');
      expect(draft?.created_by_id).toBe(1);
      expect(draft?.updated_by_id).toBe(1);
    });
  });

  describe('relation order when non-DP entries relate to DP entries', () => {
    beforeAll(async () => {
      await knexConnection.schema.createTable('tags', (table) => {
        table.increments('id');
        table.string('document_id');
        table.string('name');
      });

      await knexConnection.schema.createTable(JOIN_TABLE, (table) => {
        table.increments('id');
        table.integer('tag_id');
        table.integer('article_id');
        table.float('tag_order');
        table.float('article_order');
      });
    });

    beforeEach(async () => {
      await knexConnection(JOIN_TABLE).delete();
      await knexConnection('tags').delete();
      await knexConnection('articles').delete();

      await knexConnection('articles').insert({
        id: 1,
        document_id: 'doc1',
        title: 'published article',
        published_at: 1779746177147,
        created_at: 1,
        updated_at: 1,
      });

      await knexConnection('tags').insert([
        { id: 10, document_id: 'tag-a', name: 'A' },
        { id: 20, document_id: 'tag-b', name: 'B' },
        { id: 30, document_id: 'tag-c', name: 'C' },
      ]);

      // Non-DP tags relate to published article in intentional order: B (20), C (30), A (10)
      await knexConnection(JOIN_TABLE).insert([
        { tag_id: 10, article_id: 1, tag_order: 3, article_order: 3 },
        { tag_id: 20, article_id: 1, tag_order: 1, article_order: 1 },
        { tag_id: 30, article_id: 1, tag_order: 2, article_order: 2 },
      ]);
    });

    it('preserves inverse relation order on draft targets cloned from published entries (#24469)', async () => {
      const db = buildMigrationDb({ includeTags: true });
      setupStrapi(db, { includeTags: true });

      await runDiscardDraftsMigration(knexConnection, db);

      const publishedRelations = await knexConnection(JOIN_TABLE)
        .where({ article_id: 1 })
        .orderBy('article_order', 'asc')
        .select('tag_id', 'article_order');

      const draftRelations = await getDraftArticleTagOrder(knexConnection);

      expect(publishedRelations.map((row) => row.tag_id)).toEqual([20, 30, 10]);
      expect(draftRelations.map((row) => row.tag_id)).toEqual([20, 30, 10]);
      expect(draftRelations.map((row) => row.article_order)).toEqual([1, 2, 3]);
    });

    it('preserves inverse relation order when only owner-side order was set in v4 (#24469)', async () => {
      await knexConnection(JOIN_TABLE).delete();
      // v4 legacy rows: tag_order set from owner side, article_order null on inverse
      await knexConnection(JOIN_TABLE).insert([
        { tag_id: 10, article_id: 1, tag_order: 3, article_order: null },
        { tag_id: 20, article_id: 1, tag_order: 1, article_order: null },
        { tag_id: 30, article_id: 1, tag_order: 2, article_order: null },
      ]);

      const db = buildMigrationDb({ includeTags: true });
      setupStrapi(db, { includeTags: true });

      await runDiscardDraftsMigration(knexConnection, db);

      const draftRelations = await getDraftArticleTagOrder(knexConnection);

      expect(draftRelations.map((row) => row.tag_id)).toEqual([20, 30, 10]);
    });

    it('preserves relation order when DP entry owns the relation to non-DP targets (#24469)', async () => {
      const db = buildArticleOwnsTagsMigrationDb();
      setupArticleOwnsTagsStrapi(db);

      await knexConnection(JOIN_TABLE).delete();
      // Article owns relation: article_order is source-side order (B, C, A)
      await knexConnection(JOIN_TABLE).insert([
        { tag_id: 10, article_id: 1, article_order: 3, tag_order: 3 },
        { tag_id: 20, article_id: 1, article_order: 1, tag_order: 1 },
        { tag_id: 30, article_id: 1, article_order: 2, tag_order: 2 },
      ]);

      await runDiscardDraftsMigration(knexConnection, db);

      const draftRelations = await getDraftArticleTagOrder(knexConnection);

      expect(draftRelations.map((row) => row.tag_id)).toEqual([20, 30, 10]);
    });

    it('preserves owner-side order when only inverse order was set in v4 (#24469)', async () => {
      const db = buildArticleOwnsTagsMigrationDb();
      setupArticleOwnsTagsStrapi(db);

      await knexConnection(JOIN_TABLE).delete();
      // Article owns relation: tag_order set on inverse side, article_order null on source side
      await knexConnection(JOIN_TABLE).insert([
        { tag_id: 10, article_id: 1, article_order: null, tag_order: 3 },
        { tag_id: 20, article_id: 1, article_order: null, tag_order: 1 },
        { tag_id: 30, article_id: 1, article_order: null, tag_order: 2 },
      ]);

      await runDiscardDraftsMigration(knexConnection, db);

      const draftRelations = await getDraftArticleTagOrder(knexConnection);

      expect(draftRelations.map((row) => row.tag_id)).toEqual([20, 30, 10]);
      expect(draftRelations.map((row) => row.article_order)).toEqual([1, 2, 3]);
    });

    it('falls back to source id tie-breaker when both order columns are null', async () => {
      await knexConnection(JOIN_TABLE).delete();
      await knexConnection(JOIN_TABLE).insert([
        { tag_id: 30, article_id: 1, tag_order: null, article_order: null },
        { tag_id: 10, article_id: 1, tag_order: null, article_order: null },
        { tag_id: 20, article_id: 1, tag_order: null, article_order: null },
      ]);

      const db = buildMigrationDb({ includeTags: true });
      setupStrapi(db, { includeTags: true });

      await runDiscardDraftsMigration(knexConnection, db);

      const draftRelations = await getDraftArticleTagOrder(knexConnection);

      // No order values → sort by tag_id (tieBreakerColumn)
      expect(draftRelations.map((row) => row.tag_id)).toEqual([10, 20, 30]);
      expect(draftRelations.map((row) => row.article_order)).toEqual([1, 2, 3]);
    });

    it('uses source id tie-breaker when fallback order values are duplicated', async () => {
      await knexConnection(JOIN_TABLE).delete();
      // Same tag_order on every row → article_order must be derived via tag_id
      await knexConnection(JOIN_TABLE).insert([
        { tag_id: 30, article_id: 1, tag_order: 1, article_order: null },
        { tag_id: 10, article_id: 1, tag_order: 1, article_order: null },
        { tag_id: 20, article_id: 1, tag_order: 1, article_order: null },
      ]);

      const db = buildMigrationDb({ includeTags: true });
      setupStrapi(db, { includeTags: true });

      await runDiscardDraftsMigration(knexConnection, db);

      const draftRelations = await getDraftArticleTagOrder(knexConnection);

      expect(draftRelations.map((row) => row.tag_id)).toEqual([10, 20, 30]);
      expect(draftRelations.map((row) => row.article_order)).toEqual([1, 2, 3]);
    });

    it('no-ops relation cloning when the published entry has no relations', async () => {
      await knexConnection(JOIN_TABLE).delete();

      const db = buildMigrationDb({ includeTags: true });
      setupStrapi(db, { includeTags: true });

      await runDiscardDraftsMigration(knexConnection, db);

      const draftArticle = await knexConnection('articles').whereNull('published_at').first();
      const draftRelations = await knexConnection(JOIN_TABLE).where({
        article_id: draftArticle.id,
      });
      const publishedRelations = await knexConnection(JOIN_TABLE).where({ article_id: 1 });

      expect(draftArticle?.document_id).toBe('doc1');
      expect(publishedRelations).toHaveLength(0);
      expect(draftRelations).toHaveLength(0);
    });
  });
});

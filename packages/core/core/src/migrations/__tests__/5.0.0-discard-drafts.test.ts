import type { Database } from '@strapi/database';
import { createConnection } from "@strapi/database/src/connection";

import { discardDocumentDrafts } from '../database/5.0.0-discard-drafts';

const ARTICLE_UID = 'api::article.article';

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

const articleAttributes = {
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

const articleMeta = {
  uid: ARTICLE_UID,
  tableName: 'articles',
  singularName: 'article',
  attributes: articleAttributes,
};

const adminUserMeta = {
  uid: 'admin::user',
  tableName: 'admin_users',
  singularName: 'user',
  attributes: {
    id: { type: 'increments', columnName: 'id' },
  },
};

const buildMigrationDb = (): Database =>
  ({
    metadata: {
      get(uid: string) {
        if (uid === ARTICLE_UID) {
          return articleMeta;
        }
        if (uid === 'admin::user') {
          return adminUserMeta;
        }
        return null;
      },
      values: () => [articleMeta],
    },
    dialect: {
      getBatchInsertSize: () => 500,
    },
  }) as unknown as Database;

const setupStrapi = (db: Database) => {
  global.strapi = {
    log: { info: jest.fn(), warn: jest.fn() },
    getModel(uid: string) {
      if (uid === ARTICLE_UID) {
        return {
          uid: ARTICLE_UID,
          options: { draftAndPublish: true },
          attributes: articleAttributes,
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
        attributes: articleAttributes,
      },
    },
    components: {},
    plugins: {},
    db,
    plugin: () => undefined,
  } as any;
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
      const db = buildMigrationDb();
      setupStrapi(db);

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
});

/**
 * Runtime evidence for Content Manager service results that come straight from `strapi.db.query`
 * and are typed `any` by inference: `document-manager.findLocales` and
 * `document-metadata.getManyAvailableStatus`. Each test records the key set and value types of
 * the rows, for a localized and a non-localized content type. Later typing work relies on these
 * shapes: the hand-written contracts in `packages/core/content-manager/server/src/types/services.ts`
 * must follow them.
 */
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';

const articleUid = 'api::article.article';
const tagUid = 'api::tag.tag';

const localized = { i18n: { localized: true } };

const tagModel = {
  kind: 'collectionType',
  singularName: 'tag',
  pluralName: 'tags',
  displayName: 'Tag',
  draftAndPublish: true,
  attributes: {
    name: { type: 'string' },
  },
};

const articleModel = {
  kind: 'collectionType',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  draftAndPublish: true,
  pluginOptions: localized,
  attributes: {
    title: { type: 'string', pluginOptions: localized },
    tag: { type: 'relation', relation: 'manyToOne', target: tagUid },
  },
};

/** The runtime type of each value, keyed by field: `null`, `array`, `date` or the `typeof`. */
const shapeOf = (row: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (value === null) return [key, 'null'];
      if (Array.isArray(value) === true) return [key, 'array'];
      if (value instanceof Date) return [key, 'date'];
      return [key, typeof value];
    })
  );

const VERSION_ROW_SHAPE = {
  id: 'number',
  documentId: 'string',
  createdAt: 'string',
  updatedAt: 'string',
};

describe('Content Manager service results (database rows)', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let documentManager: any;
  let documentMetadata: any;

  let articleDocumentId: string;
  let tagDocumentId: string;

  beforeAll(async () => {
    await builder
      .addContentTypes([tagModel, articleModel])
      .addFixtures('plugin::i18n.locale', [{ name: 'French', code: 'fr' }])
      .build();

    strapi = await createStrapiInstance();
    documentManager = strapi.plugin('content-manager').service('document-manager');
    documentMetadata = strapi.plugin('content-manager').service('document-metadata');

    const tag = await strapi.documents(tagUid).create({ data: { name: 'Tag' } });
    tagDocumentId = tag.documentId;
    await strapi.documents(tagUid).publish({ documentId: tagDocumentId });

    // `en` has a draft and a published version, `fr` only a draft
    const article = await strapi.documents(articleUid).create({
      data: { title: 'Article EN', tag: tagDocumentId },
      locale: 'en',
    });
    articleDocumentId = article.documentId;
    await strapi.documents(articleUid).update({
      documentId: articleDocumentId,
      data: { title: 'Article FR', tag: tagDocumentId },
      locale: 'fr',
    });
    await strapi.documents(articleUid).publish({ documentId: articleDocumentId, locale: 'en' });
  });

  afterAll(async () => {
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('document-manager.findLocales', () => {
    const ARTICLE_ROW_SHAPE = { ...VERSION_ROW_SHAPE, title: 'string', locale: 'string' };
    const TAG_ROW_SHAPE = { ...VERSION_ROW_SHAPE, name: 'string', locale: 'null' };

    const findLocales = (
      id: string | string[] | undefined,
      uid: string,
      opts: Record<string, unknown>
    ): Promise<Record<string, unknown>[]> => documentManager.findLocales(id, uid, opts);

    test('without isPublished, returns every version as a row without relations or status', async () => {
      const rows = await findLocales(articleDocumentId, articleUid, { locale: '*' });

      expect(rows).toHaveLength(3);
      expect(rows.map((row) => [row.locale, row.publishedAt === null])).toEqual(
        expect.arrayContaining([
          ['en', true],
          ['en', false],
          ['fr', true],
        ])
      );

      const drafts = rows.filter((row) => row.publishedAt === null);
      const published = rows.filter((row) => row.publishedAt !== null);
      drafts.forEach((row) =>
        expect(shapeOf(row)).toEqual({ ...ARTICLE_ROW_SHAPE, publishedAt: 'null' })
      );
      published.forEach((row) =>
        expect(shapeOf(row)).toEqual({ ...ARTICLE_ROW_SHAPE, publishedAt: 'string' })
      );
    });

    test('with isPublished true, returns only published rows', async () => {
      const rows = await findLocales(articleDocumentId, articleUid, {
        locale: '*',
        isPublished: true,
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].locale).toBe('en');
      expect(shapeOf(rows[0])).toEqual({ ...ARTICLE_ROW_SHAPE, publishedAt: 'string' });
    });

    test('with isPublished false, returns only draft rows', async () => {
      const rows = await findLocales(articleDocumentId, articleUid, {
        locale: ['en', 'fr'],
        isPublished: false,
      });

      expect(rows.map((row) => row.locale).sort()).toEqual(['en', 'fr']);
      rows.forEach((row) =>
        expect(shapeOf(row)).toEqual({ ...ARTICLE_ROW_SHAPE, publishedAt: 'null' })
      );
    });

    test('with a single locale, filters on it', async () => {
      const rows = await findLocales(articleDocumentId, articleUid, { locale: 'fr' });

      expect(rows).toHaveLength(1);
      expect(rows[0].locale).toBe('fr');
    });

    test('with populate, adds the populated relation as a database row', async () => {
      const rows = await findLocales(articleDocumentId, articleUid, {
        locale: 'en',
        isPublished: false,
        populate: { tag: true },
      });

      expect(rows).toHaveLength(1);
      expect(shapeOf(rows[0])).toEqual({
        ...ARTICLE_ROW_SHAPE,
        publishedAt: 'null',
        tag: 'object',
      });
      // The draft points at the draft tag
      expect(shapeOf(rows[0].tag as Record<string, unknown>)).toEqual({
        ...TAG_ROW_SHAPE,
        publishedAt: 'null',
      });
    });

    test('on a non-localized content type, rows hold a null locale', async () => {
      const rows = await findLocales(tagDocumentId, tagUid, {});

      expect(rows).toHaveLength(2);
      const drafts = rows.filter((row) => row.publishedAt === null);
      const published = rows.filter((row) => row.publishedAt !== null);
      expect(drafts).toHaveLength(1);
      expect(published).toHaveLength(1);
      expect(shapeOf(drafts[0])).toEqual({ ...TAG_ROW_SHAPE, publishedAt: 'null' });
      expect(shapeOf(published[0])).toEqual({ ...TAG_ROW_SHAPE, publishedAt: 'string' });
    });
  });

  describe('document-metadata.getManyAvailableStatus', () => {
    // Only the selected scalar fields: no other attribute, no relation, no status
    const STATUS_ROW_KEYS = ['createdAt', 'documentId', 'id', 'locale', 'publishedAt', 'updatedAt'];

    test('returns no row for an empty batch', async () => {
      await expect(documentMetadata.getManyAvailableStatus(articleUid, [])).resolves.toEqual([]);
    });

    test('for localized drafts, returns the published versions of their locales', async () => {
      const drafts = await documentManager.findLocales(articleDocumentId, articleUid, {
        locale: '*',
        isPublished: false,
      });

      const rows: Record<string, unknown>[] = await documentMetadata.getManyAvailableStatus(
        articleUid,
        drafts
      );

      // `fr` has no published version
      expect(rows).toHaveLength(1);
      expect(Object.keys(rows[0]).sort()).toEqual(STATUS_ROW_KEYS);
      expect(shapeOf(rows[0])).toEqual({
        ...VERSION_ROW_SHAPE,
        locale: 'string',
        publishedAt: 'string',
      });
      expect(rows[0].locale).toBe('en');
    });

    test('for a published version, returns its draft', async () => {
      const published = await documentManager.findLocales(articleDocumentId, articleUid, {
        locale: 'en',
        isPublished: true,
      });

      const rows: Record<string, unknown>[] = await documentMetadata.getManyAvailableStatus(
        articleUid,
        published
      );

      expect(rows).toHaveLength(1);
      expect(Object.keys(rows[0]).sort()).toEqual(STATUS_ROW_KEYS);
      expect(shapeOf(rows[0])).toEqual({
        ...VERSION_ROW_SHAPE,
        locale: 'string',
        publishedAt: 'null',
      });
    });

    test('on a non-localized content type, rows hold a null locale', async () => {
      const drafts = await documentManager.findLocales(tagDocumentId, tagUid, {
        isPublished: false,
      });

      const rows: Record<string, unknown>[] = await documentMetadata.getManyAvailableStatus(
        tagUid,
        drafts
      );

      expect(rows).toHaveLength(1);
      expect(Object.keys(rows[0]).sort()).toEqual(STATUS_ROW_KEYS);
      expect(shapeOf(rows[0])).toEqual({
        ...VERSION_ROW_SHAPE,
        locale: 'null',
        publishedAt: 'string',
      });
    });
  });
});

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { describeOnCondition } from 'api-tests/utils';
import { createTestBuilder } from 'api-tests/builder';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const HISTORY_VERSION_UID = 'plugin::content-manager.history-version';

const categoryUid = 'api::category.category';
const categoryModel = {
  draftAndPublish: false,
  singularName: 'category',
  pluralName: 'categories',
  displayName: 'Category',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const tagUid = 'api::tag.tag';
const tagModel = {
  draftAndPublish: true,
  singularName: 'tag',
  pluralName: 'tags',
  displayName: 'Tag',
  kind: 'collectionType',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

const articleUid = 'api::article.article';
const articleModel = {
  draftAndPublish: true,
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  kind: 'collectionType',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    category: {
      type: 'relation',
      relation: 'oneToOne',
      target: categoryUid,
    },
    tags: {
      type: 'relation',
      relation: 'oneToMany',
      target: tagUid,
    },
  },
};

/**
 * Records the shape of the relation entries a history version stores,
 * which `getRelationRestoreValue` reads back when restoring the version.
 */
describeOnCondition(edition === 'EE')('History API - stored relations', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;
  let categoryDocumentId: string;
  let tagDocumentId: string;
  let articleDocumentId: string;

  beforeAll(async () => {
    builder.addContentTypes([categoryModel, tagModel, articleModel]);
    await builder.build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const category = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${categoryUid}`,
      body: { name: 'Category 1' },
    });
    categoryDocumentId = category.body.data.documentId;

    const tag = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${tagUid}`,
      body: { name: 'Tag 1' },
    });
    tagDocumentId = tag.body.data.documentId;

    const article = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${articleUid}`,
      body: { title: 'Article 1', category: categoryDocumentId, tags: [tagDocumentId] },
    });
    articleDocumentId = article.body.data.documentId;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Stores relation entries with a null locale for a non-localized target', async () => {
    const [version] = await strapi.db.query(HISTORY_VERSION_UID).findMany({
      where: { contentType: articleUid, relatedDocumentId: articleDocumentId },
    });

    expect(version.data.category).toEqual({
      documentId: categoryDocumentId,
      locale: null,
      publishedAt: expect.any(String),
    });
    expect(version.data.tags).toEqual([
      {
        documentId: tagDocumentId,
        locale: 'en',
        publishedAt: null,
      },
    ]);
  });

  test('Restores relations to a localized and a non-localized target', async () => {
    const versions = await rq({
      method: 'GET',
      url: `/content-manager/history-versions?contentType=${articleUid}&documentId=${articleDocumentId}&locale=en`,
    });

    const res = await rq({
      method: 'PUT',
      url: `/content-manager/history-versions/${versions.body.data.at(-1).id}/restore`,
      body: { contentType: articleUid },
    });
    const restoredDocument = await strapi.documents(articleUid).findOne({
      documentId: articleDocumentId,
      populate: ['category', 'tags'],
    });

    expect(res.statusCode).toBe(200);
    expect(restoredDocument.category.documentId).toBe(categoryDocumentId);
    expect(restoredDocument.tags.map((tag) => tag.documentId)).toEqual([tagDocumentId]);
  });
});

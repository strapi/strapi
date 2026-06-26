/**
 * Publishing non-localized content types with a mappedBy oneToMany relation,
 * including when related rows still carry a stale locale column in the database.
 */
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

const UID_FEATURE = 'api::feature.feature';
const UID_FEATURE_CATEGORY = 'api::feature-category.feature-category';

const featureModel = {
  attributes: {
    title: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  displayName: 'Feature',
  singularName: 'feature',
  pluralName: 'features',
  description: '',
  collectionName: '',
};

const featureCategoryModel = {
  attributes: {
    title: {
      type: 'string',
    },
    features: {
      type: 'relation',
      relation: 'oneToMany',
      target: UID_FEATURE,
      targetAttribute: 'feature_category',
    },
  },
  draftAndPublish: true,
  displayName: 'Feature category',
  singularName: 'feature-category',
  pluralName: 'feature-categories',
  description: '',
  collectionName: '',
};

describe('CM API - mappedBy oneToMany publish (non-localized)', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;

  beforeAll(async () => {
    await builder.addContentTypes([featureModel, featureCategoryModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  it('publishes feature category after connecting features from the inverse side', async () => {
    const featureRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE}`,
      body: { title: 'My feature' },
    });
    expect(featureRes.statusCode).toBe(201);
    const featureDocumentId = featureRes.body.data.documentId;

    const categoryRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}`,
      body: { title: 'My category' },
    });
    expect(categoryRes.statusCode).toBe(201);
    const categoryDocumentId = categoryRes.body.data.documentId;

    const updateRes = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}/${categoryDocumentId}`,
      body: {
        features: { connect: [{ documentId: featureDocumentId }] },
      },
    });
    expect(updateRes.statusCode).toBe(200);

    const publishRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}/${categoryDocumentId}/actions/publish`,
      body: {
        features: { connect: [{ documentId: featureDocumentId }] },
      },
    });

    expect(publishRes.statusCode).toBe(200);
    expect(publishRes.body.data.publishedAt).toBeDefined();
  });

  it('publishes feature category when feature is already published', async () => {
    const featureRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE}`,
      body: { title: 'Published feature' },
    });
    expect(featureRes.statusCode).toBe(201);
    const featureDocumentId = featureRes.body.data.documentId;

    await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE}/${featureDocumentId}/actions/publish`,
    });

    const categoryRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}`,
      body: {
        title: 'Category with published feature',
        features: { connect: [{ documentId: featureDocumentId }] },
      },
    });
    expect(categoryRes.statusCode).toBe(201);
    const categoryDocumentId = categoryRes.body.data.documentId;

    const publishRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}/${categoryDocumentId}/actions/publish`,
    });

    expect(publishRes.statusCode).toBe(200);
    expect(publishRes.body.data.publishedAt).toBeDefined();
  });

  it('publishes when publish body includes populated feature objects with locale null', async () => {
    const featureRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE}`,
      body: { title: 'Populated feature' },
    });
    expect(featureRes.statusCode).toBe(201);
    const feature = featureRes.body.data;

    const categoryRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}`,
      body: { title: 'Populated category' },
    });
    expect(categoryRes.statusCode).toBe(201);
    const categoryDocumentId = categoryRes.body.data.documentId;

    const publishRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}/${categoryDocumentId}/actions/publish`,
      body: {
        title: 'Populated category',
        features: [
          {
            documentId: feature.documentId,
            locale: null,
            title: feature.title,
            publishedAt: null,
          },
        ],
      },
    });

    expect(publishRes.statusCode).toBe(200);
    expect(publishRes.body.data.publishedAt).toBeDefined();
  });

  it('publishes when connecting a draft-only feature via set on publish', async () => {
    const featureRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE}`,
      body: { title: 'Draft only feature' },
    });
    expect(featureRes.statusCode).toBe(201);
    const featureDocumentId = featureRes.body.data.documentId;

    const categoryRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}`,
      body: { title: 'Category draft feature' },
    });
    expect(categoryRes.statusCode).toBe(201);
    const categoryDocumentId = categoryRes.body.data.documentId;

    const publishRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}/${categoryDocumentId}/actions/publish`,
      body: {
        features: { set: [{ documentId: featureDocumentId, locale: null }] },
      },
    });

    expect(publishRes.statusCode).toBe(200);
    expect(publishRes.body.data.publishedAt).toBeDefined();
  });

  it('republishes category after adding a feature to an already published category', async () => {
    const featureRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE}`,
      body: { title: 'Feature for republish' },
    });
    expect(featureRes.statusCode).toBe(201);
    const featureDocumentId = featureRes.body.data.documentId;

    const categoryRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}`,
      body: { title: 'Category to republish' },
    });
    expect(categoryRes.statusCode).toBe(201);
    const categoryDocumentId = categoryRes.body.data.documentId;

    const firstPublish = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}/${categoryDocumentId}/actions/publish`,
    });
    expect(firstPublish.statusCode).toBe(200);

    const updateRes = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}/${categoryDocumentId}`,
      body: {
        features: { connect: [{ documentId: featureDocumentId }] },
      },
    });
    expect(updateRes.statusCode).toBe(200);

    const republishRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}/${categoryDocumentId}/actions/publish`,
      body: {
        features: { connect: [{ documentId: featureDocumentId }] },
      },
    });

    expect(republishRes.statusCode).toBe(200);
    expect(republishRes.body.data.publishedAt).toBeDefined();
  });

  it('resolves relations when non-localized rows have a stale default locale in the database', async () => {
    const featureRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE}`,
      body: { title: 'Stale locale feature' },
    });
    expect(featureRes.statusCode).toBe(201);
    const featureDocumentId = featureRes.body.data.documentId;

    // Simulate entries created while the type was briefly localized (locale set to default).
    await strapi.db.query(UID_FEATURE).updateMany({
      where: { documentId: featureDocumentId },
      data: { locale: 'en' },
    });

    const categoryRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}`,
      body: { title: 'Category stale locale' },
    });
    expect(categoryRes.statusCode).toBe(201);
    const categoryDocumentId = categoryRes.body.data.documentId;

    const publishRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}/${categoryDocumentId}/actions/publish`,
      body: {
        features: { connect: [{ documentId: featureDocumentId }] },
      },
    });

    expect(publishRes.statusCode).toBe(200);
    expect(publishRes.body.data.publishedAt).toBeDefined();
  });

  it('fails with locale null message when connecting a non-existent feature documentId', async () => {
    const categoryRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}`,
      body: { title: 'Category missing feature' },
    });
    expect(categoryRes.statusCode).toBe(201);
    const categoryDocumentId = categoryRes.body.data.documentId;

    const publishRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_FEATURE_CATEGORY}/${categoryDocumentId}/actions/publish`,
      body: {
        features: { connect: [{ documentId: 'non-existent-document-id' }] },
      },
    });

    expect(publishRes.statusCode).toBe(400);
    expect(publishRes.body.error.message).toMatch(/locale "null" not found/);
  });
});

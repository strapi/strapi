'use strict';

// Helpers.
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
const MODEL_UID = 'api::single-type-model.single-type-model';

const ct = {
  kind: 'singleType',
  displayName: 'single-type-model',
  singularName: 'single-type-model',
  pluralName: 'single-type-models',
  draftAndPublish: true,
  attributes: {
    title: {
      type: 'string',
    },
  },
};

const createOrUpdate = async (data) => {
  return rq({
    url: `/content-manager/single-types/${MODEL_UID}`,
    method: 'PUT',
    body: data,
  });
};

const find = async () => {
  return rq({
    url: `/content-manager/single-types/${MODEL_UID}`,
    method: 'GET',
  });
};

const deleteSingleType = async () => {
  return rq({
    url: `/content-manager/single-types/${MODEL_UID}`,
    method: 'DELETE',
  });
};

const publish = async (data) => {
  return rq({
    url: `/content-manager/single-types/${MODEL_UID}/actions/publish`,
    method: 'POST',
    body: data,
  });
};

const unpublish = async (discardDraft = false) => {
  return rq({
    url: `/content-manager/single-types/${MODEL_UID}/actions/unpublish`,
    body: { discardDraft },
    method: 'POST',
  });
};

describe('Content Manager single types', () => {
  beforeAll(async () => {
    await builder.addContentType(ct).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  beforeEach(async () => {
    await strapi.db.query(MODEL_UID).deleteMany({});
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Find single type content returns 404 when not created', async () => {
    const res = await rq({
      url: `/content-manager/single-types/${MODEL_UID}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(404);
  });

  test('Create', async () => {
    const resCreate = await createOrUpdate({ title: 'Title' });
    expect(resCreate.statusCode).toBe(200);
    expect(resCreate.body.data).toMatchObject({
      id: expect.anything(),
      title: 'Title',
    });
  });

  test('Find single type', async () => {
    const resCreate = await createOrUpdate({ title: 'Title' });
    expect(resCreate.statusCode).toBe(200);

    const resGet = await find();
    expect(resGet.statusCode).toBe(200);
    expect(resGet.body.data).toMatchObject({
      id: expect.anything(),
      title: 'Title',
    });
  });

  test('Update', async () => {
    await createOrUpdate({ title: 'Title' });
    const res = await createOrUpdate({ title: 'Title-updated' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      id: expect.anything(),
      title: 'Title-updated',
    });
  });

  test('Delete', async () => {
    await createOrUpdate({ title: 'Title' });

    const delRes = await deleteSingleType();
    expect(delRes.statusCode).toBe(200);

    // Try to find the single type again to check if it was deleted
    const res = await find();
    expect(res.statusCode).toBe(404);
  });

  test('Publish and create', async () => {
    const res = await publish({ title: 'Title-created-and-published' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      id: expect.anything(),
      title: 'Title-created-and-published',
    });
    expect(res.body.data.published_at).not.toBe(null);
    expect(res.body.data.locale).toBe(null);

    // There should be a draft and a published entry in db
    const documents = await strapi.db.query(MODEL_UID).findMany({});

    const draftDocument = documents.find((doc) => doc.publishedAt === null);
    const publishedDocument = documents.find((doc) => doc.publishedAt !== null);

    expect(documents.length).toBe(2);
    expect(draftDocument).not.toBeUndefined();
    expect(publishedDocument).not.toBeUndefined();
  });

  test('Publish and update', async () => {
    await createOrUpdate({ title: 'Title' });
    const res = await publish({ title: 'Title-updated-and-published' });

    expect(res.statusCode).toBe(200);

    // Both draft and publish versions should have been updated
    const documents = await strapi.db.query(MODEL_UID).findMany({});

    const draftDocument = documents.find((doc) => doc.publishedAt === null);
    const publishedDocument = documents.find((doc) => doc.publishedAt !== null);

    expect(documents.length).toBe(2);
    expect(draftDocument.title).toBe('Title-updated-and-published');
    expect(publishedDocument.title).toBe('Title-updated-and-published');
  });

  test('Unpublish', async () => {
    // Create and publish
    const publishedRes = await publish({ title: 'Title-published' });
    expect(publishedRes.statusCode).toBe(200);

    const unpublishedRes = await unpublish();
    expect(unpublishedRes.statusCode).toBe(200);

    // There should be a draft and a published entry in db
    const documents = await strapi.db.query(MODEL_UID).findMany({});

    const draftDocument = documents.find((doc) => doc.publishedAt === null);
    const publishedDocument = documents.find((doc) => doc.publishedAt !== null);

    expect(documents.length).toBe(1);
    expect(draftDocument).not.toBeUndefined();
    expect(publishedDocument).toBeUndefined();
  });

  test('Unpublish and discard draft', async () => {
    // Create and publish
    const publishedRes = await publish({ title: 'Title-published' });
    expect(publishedRes.statusCode).toBe(200);

    // Update draft
    await createOrUpdate({ title: 'Title-draft' });

    // Unpublish and discard draft
    const unpublishedRes = await unpublish(true);
    expect(unpublishedRes.statusCode).toBe(200);

    // Published entry should be deleted, and draft should contain the published content
    const documents = await strapi.db.query(MODEL_UID).findMany({});

    const draftDocument = documents.find((doc) => doc.publishedAt === null);
    const publishedDocument = documents.find((doc) => doc.publishedAt !== null);

    expect(documents.length).toBe(1);
    expect(draftDocument).not.toBeUndefined();
    expect(draftDocument.title).toBe('Title-published');
    expect(publishedDocument).toBeUndefined();
  });

  // TODO: Move to i18n tests
  test('Publish and create locale', async () => {});
});

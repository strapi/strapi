/**
 * Publish, unpublish and discard only make sense for content types with
 * Draft & Publish enabled. On a content type without it, these admin
 * endpoints must answer with a client error, not with a server error.
 */
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

const singleTypeUid = 'api::non-dp-single.non-dp-single';
const collectionTypeUid = 'api::non-dp-collection.non-dp-collection';

const singleTypeModel = {
  kind: 'singleType',
  displayName: 'non-dp-single',
  singularName: 'non-dp-single',
  pluralName: 'non-dp-singles',
  draftAndPublish: false,
  attributes: {
    title: {
      type: 'string',
    },
  },
};

const collectionTypeModel = {
  kind: 'collectionType',
  displayName: 'non-dp-collection',
  singularName: 'non-dp-collection',
  pluralName: 'non-dp-collections',
  draftAndPublish: false,
  attributes: {
    title: {
      type: 'string',
    },
  },
};

const expectedError = {
  data: null,
  error: {
    status: 400,
    name: 'ValidationError',
    message: 'Draft and publish is not enabled for this content type',
  },
};

describe('Content Manager publish actions without Draft & Publish', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;

  beforeAll(async () => {
    await builder.addContentTypes([singleTypeModel, collectionTypeModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Single type', () => {
    beforeAll(async () => {
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/single-types/${singleTypeUid}`,
        body: { title: 'Home' },
      });

      expect(res.statusCode).toBe(200);
    });

    test.each(['publish', 'unpublish', 'discard'])('%s answers with a 400', async (action) => {
      const res = await rq({
        method: 'POST',
        url: `/content-manager/single-types/${singleTypeUid}/actions/${action}`,
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject(expectedError);
    });

    test('publish does not save the request data', async () => {
      const res = await rq({
        method: 'POST',
        url: `/content-manager/single-types/${singleTypeUid}/actions/publish`,
        body: { title: 'Changed' },
      });

      expect(res.statusCode).toBe(400);

      const document = await strapi.documents(singleTypeUid).findFirst();
      expect(document.title).toBe('Home');
    });
  });

  describe('Collection type', () => {
    let documentId: string;

    beforeAll(async () => {
      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${collectionTypeUid}`,
        body: { title: 'Entry' },
      });

      expect(res.statusCode).toBe(201);
      documentId = res.body.data.documentId;
    });

    test('publish of a new document answers with a 400', async () => {
      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${collectionTypeUid}/actions/publish`,
        body: { title: 'New entry' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject(expectedError);
      expect(await strapi.documents(collectionTypeUid).count({})).toBe(1);
    });

    test.each(['publish', 'unpublish', 'discard'])('%s answers with a 400', async (action) => {
      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${collectionTypeUid}/${documentId}/actions/${action}`,
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject(expectedError);
    });

    test.each(['bulkPublish', 'bulkUnpublish'])('%s answers with a 400', async (action) => {
      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${collectionTypeUid}/actions/${action}`,
        body: { documentIds: [documentId] },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject(expectedError);
    });
  });
});

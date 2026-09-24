'use strict';

// Helpers.
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');

const builder = createTestBuilder();
let strapi;
let rq;
const uid = 'single-type';
const data = {};

const relatedModel = {
  kind: 'collectionType',
  displayName: 'related-type',
  singularName: 'related-type',
  pluralName: 'related-types',
  attributes: {
    name: {
      type: 'string',
    },
    privateToken: {
      type: 'string',
      private: true,
    },
  },
};

const model = {
  kind: 'singleType',
  displayName: 'single-type',
  singularName: 'single-type',
  pluralName: 'single-types',
  attributes: {
    title: {
      type: 'string',
    },
    related: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::related-type.related-type',
    },
  },
};

describe('Content Manager single types', () => {
  beforeAll(async () => {
    await builder.addContentTypes([relatedModel, model]).build();

    strapi = await createStrapiInstance();

    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('find single type content returns 404 when not created', async () => {
    const res = await rq({
      url: `/${uid}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(404);
  });

  test('Create content', async () => {
    const relatedRes = await rq({
      url: `/${relatedModel.pluralName}`,
      method: 'POST',
      body: {
        data: {
          name: 'Related content',
          privateToken: 'matching-private-token',
        },
      },
    });

    expect(relatedRes.statusCode).toBe(201);
    data.relatedDocumentId = relatedRes.body.data.documentId;

    const res = await rq({
      url: `/${uid}`,
      method: 'PUT',
      body: {
        data: {
          title: 'Title',
          related: data.relatedDocumentId,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      documentId: expect.anything(),
      title: 'Title',
    });

    expect(res.body.data.publishedAt).toBeISODate();

    data.documentId = res.body.data.documentId;
  });

  test('Update rejects populate filters on private related fields', async () => {
    const matchingFilterRes = await rq({
      url: `/${uid}`,
      method: 'PUT',
      body: {
        data: {
          title: 'Title',
        },
      },
      qs: {
        populate: {
          related: {
            filters: {
              privateToken: {
                $eq: 'matching-private-token',
              },
            },
          },
        },
      },
    });

    const nonMatchingFilterRes = await rq({
      url: `/${uid}`,
      method: 'PUT',
      body: {
        data: {
          title: 'Title',
        },
      },
      qs: {
        populate: {
          related: {
            filters: {
              privateToken: {
                $eq: 'wrong-private-token',
              },
            },
          },
        },
      },
    });

    expect({
      matchingStatus: matchingFilterRes.statusCode,
      matchingRelatedDocumentId: matchingFilterRes.body.data?.related?.documentId,
      nonMatchingStatus: nonMatchingFilterRes.statusCode,
      nonMatchingRelated: nonMatchingFilterRes.body.data?.related,
    }).toEqual({
      matchingStatus: 400,
      matchingRelatedDocumentId: undefined,
      nonMatchingStatus: 400,
      nonMatchingRelated: undefined,
    });
  });

  test('Update accepts benign populate on related content', async () => {
    const res = await rq({
      url: `/${uid}`,
      method: 'PUT',
      body: {
        data: {
          title: 'Title',
        },
      },
      qs: {
        populate: {
          related: true,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      documentId: data.documentId,
      title: 'Title',
      related: {
        documentId: data.relatedDocumentId,
        name: 'Related content',
      },
    });
    expect(res.body.data.related.privateToken).toBeUndefined();
  });

  test('Update keeps the same data id', async () => {
    const res = await rq({
      url: `/${uid}`,
      method: 'PUT',
      body: {
        data: {
          title: 'Title',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      documentId: data.documentId,
      title: 'Title',
    });
  });

  test('find single type content returns an object ', async () => {
    const res = await rq({
      url: `/${uid}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      documentId: expect.anything(),
      title: 'Title',
    });
  });

  test('Delete single type content returns an object and makes data unavailable', async () => {
    const invalidDeleteRes = await rq({
      url: `/${uid}`,
      method: 'DELETE',
      qs: {
        populate: {
          related: {
            filters: {
              privateToken: {
                $eq: 'matching-private-token',
              },
            },
          },
        },
      },
    });

    expect(invalidDeleteRes.statusCode).toBe(400);

    const existingRes = await rq({
      url: `/${uid}`,
      method: 'GET',
    });

    expect(existingRes.statusCode).toBe(200);
    expect(existingRes.body.data).toMatchObject({
      documentId: data.documentId,
      title: 'Title',
    });

    const res = await rq({
      url: `/${uid}`,
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(204);

    // TODO V5: Discuss if we should return the deleted entry
    // expect(res.statusCode).toBe(200);
    // expect(res.body.data).toMatchObject({
    //   documentId: expect.anything(),
    //   title: 'Title',
    // });

    const getRes = await rq({
      url: `/${uid}`,
      method: 'GET',
    });

    expect(getRes.statusCode).toBe(404);
  });
});

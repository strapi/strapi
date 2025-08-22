'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { describeOnCondition } from 'api-tests/utils';
import { createTestBuilder } from 'api-tests/builder';

import { CreateRelease } from '../../../../packages/core/content-releases/shared/contracts/releases';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const productUID = 'api::product.product';
const productModel = {
  draftAndPublish: true,
  pluginOptions: {},
  singularName: 'product',
  pluralName: 'products',
  displayName: 'Product',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'string',
    },
  },
};

describeOnCondition(edition === 'EE')('Content Releases API', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;

  const createRelease = async (
    name: string,
    params: Partial<CreateRelease.Request['body']> = {}
  ) => {
    return rq({
      method: 'POST',
      url: '/content-releases/',
      body: {
        name,
        scheduledAt: null,
        ...params,
      },
    });
  };

  const createReleaseAction = async (releaseId, { contentType, entryDocumentId, type }) => {
    return rq({
      method: 'POST',
      url: `/content-releases/${releaseId}/actions`,
      body: {
        entryDocumentId,
        contentType,
        type,
      },
    });
  };

  beforeAll(async () => {
    await builder.addContentType(productModel).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterAll(async () => {
    jest.useRealTimers();

    await strapi.destroy();
    await builder.cleanup();
  });

  test('should retrieve the list of upcoming releases', async () => {
    // Create a release not scheduled
    const createNotScheduledReleaseRes = await createRelease('Not scheduled release');
    const notScheduledRelease = createNotScheduledReleaseRes.body.data;
    // Add a product to the release
    const product = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${productUID}`,
      body: {
        name: 'Product 1',
        description: 'Description',
      },
    });
    await createReleaseAction(notScheduledRelease.id, {
      contentType: productUID,
      entryDocumentId: product.body.data.documentId,
      type: 'publish',
    });

    // Create a release with scheduled date in the future
    await createRelease('Next week release', {
      scheduledAt: new Date('2024-01-08T00:00:00.000Z'),
      timezone: 'Europe/Madrid',
    });

    const response = await rq({
      method: 'GET',
      url: '/content-releases/homepage/upcoming-releases',
    });

    // Assert the response
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(2);
    // Assert the releases data
    // Not scheduled release
    expect(response.body.data[0].name).toBe('Not scheduled release');
    expect(response.body.data[0].scheduledAt).toBeNull();
    expect(response.body.data[0].status).toBe('ready');
    // Next week release
    expect(response.body.data[1].name).toBe('Next week release');
    expect(response.body.data[1].scheduledAt).toBeDefined();
    expect(response.body.data[1].timezone).toBe('Europe/Madrid');
    expect(response.body.data[1].status).toBe('empty');
  });
});

'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { describeOnCondition } from 'api-tests/utils';
import { createTestBuilder } from 'api-tests/builder';

import { CreateRelease } from '../../../../packages/core/content-releases/shared/contracts/releases';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

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

  beforeAll(async () => {
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
    // Create a release with not scheduled (shouldn't appear in the homepage)
    await createRelease('Not scheduled release');

    // Create a release with scheduled date in the future (should appear in the homepage)
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
    expect(response.body.data).toHaveLength(1);
    // Assert the releases data
    expect(response.body.data[0].name).toBe('Next week release');
    expect(response.body.data[0].scheduledAt).toBeDefined();
    expect(response.body.data[0].timezone).toBe('Europe/Madrid');
    expect(response.body.data[0].status).toBe('empty');
  });
});

'use strict';

const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const { createAuthRequest, createRequest } = require('../../../../../../test/helpers/request');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

if (edition === 'CE') {
  test('Review-workflows (skipped)', () => {
    expect(true).toBeTruthy();
  });
  return;
}

describe('Review workflows', () => {
  const requests = {};
  let strapi;
  let hasRW;
  let defaultWorkflow;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    // eslint-disable-next-line node/no-extraneous-require
    hasRW = require('@strapi/strapi/lib/utils/ee').features.isEnabled('review-workflow');

    requests.public = createRequest({ strapi });
    requests.admin = await createAuthRequest({ strapi });

    defaultWorkflow = await strapi.query('admin::workflow').create({});
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  describe('Get workflows', () => {
    test.each(Object.keys(requests))('It should be available for everyone (%s)', async (type) => {
      const rq = requests[type];
      const res = await rq.get('/admin/review-workflows/workflows');

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.results).toHaveLength(1);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });
  });

  describe('Get one workflow', () => {
    test.each(Object.keys(requests))('It should be available for everyone (%s)', async (type) => {
      const rq = requests[type];
      const res = await rq.get(`/admin/review-workflows/workflows/${defaultWorkflow.id}`);

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.data).toEqual(defaultWorkflow);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });
  });
});

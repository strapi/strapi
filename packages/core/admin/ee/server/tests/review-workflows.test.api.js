'use strict';

const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const { createAuthRequest, createRequest } = require('../../../../../../test/helpers/request');
const { describeOnCondition } = require('../utils/test');
const { STAGE_MODEL_UID, WORKFLOW_MODEL_UID } = require('../constants/workflows');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Review workflows', () => {
  const requests = {
    public: null,
    admin: null,
  };
  let strapi;
  let hasRW;
  let defaultStage;
  let secondStage;
  let testWorkflow;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    // eslint-disable-next-line node/no-extraneous-require
    hasRW = require('@strapi/strapi/lib/utils/ee').features.isEnabled('review-workflows');

    requests.public = createRequest({ strapi });
    requests.admin = await createAuthRequest({ strapi });

    defaultStage = await strapi.query(STAGE_MODEL_UID).create({
      data: { name: 'Stage' },
    });
    secondStage = await strapi.query(STAGE_MODEL_UID).create({
      data: { name: 'Stage 2' },
    });
    testWorkflow = await strapi.query(WORKFLOW_MODEL_UID).create({
      data: {
        uid: 'workflow',
        stages: [defaultStage.id, secondStage.id],
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  describe('Get workflows', () => {
    test("It shouldn't be available for public", async () => {
      const res = await requests.public.get('/admin/review-workflows/workflows');

      if (hasRW) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const res = await requests.admin.get('/admin/review-workflows/workflows');

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBeTruthy();
        // Why 2 workflows ? One added by the test, the other one should be the default workflow added in bootstrap
        expect(res.body.data).toHaveLength(2);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });
  });

  describe('Get one workflow', () => {
    test("It shouldn't be available for public", async () => {
      const res = await requests.public.get(`/admin/review-workflows/workflows/${testWorkflow.id}`);

      if (hasRW) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const res = await requests.admin.get(`/admin/review-workflows/workflows/${testWorkflow.id}`);

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Object);
        expect(res.body.data).toEqual(testWorkflow);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
  });

  describe('Get workflow stages', () => {
    test("It shouldn't be available for public", async () => {
      const res = await requests.public.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=stages`
      );

      if (hasRW) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const res = await requests.admin.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=stages`
      );

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Object);
        expect(res.body.data.stages).toBeInstanceOf(Array);
        expect(res.body.data.stages).toHaveLength(2);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });
  });

  describe('Get stages', () => {
    test("It shouldn't be available for public", async () => {
      const res = await requests.public.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages`
      );

      if (hasRW) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const res = await requests.admin.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages`
      );

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBeTruthy();
        expect(res.body.data).toHaveLength(2);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });
  });

  describe('Get stage by id', () => {
    test("It shouldn't be available for public", async () => {
      const res = await requests.public.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages/${secondStage.id}`
      );

      if (hasRW) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const res = await requests.admin.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages/${secondStage.id}`
      );

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Object);
        expect(res.body.data).toEqual(secondStage);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
  });

  describe('Replace stages of a workflow', () => {
    let stagesUpdateData;

    beforeEach(() => {
      stagesUpdateData = [
        defaultStage,
        { id: secondStage.id, name: 'new_name' },
        { name: 'new stage' },
      ];
    });

    test("It shouldn't be available for public", async () => {
      const res = await requests.public.put(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages`,
        stagesUpdateData
      );

      if (hasRW) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const res = await requests.admin.put(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages`,
        { body: stagesUpdateData }
      );

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Object);
        expect(res.body.data.id).toEqual(testWorkflow.id);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
  });
});

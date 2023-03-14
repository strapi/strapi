'use strict';

const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const { createAuthRequest, createRequest } = require('../../../../../../test/helpers/request');
const { createTestBuilder } = require('../../../../../../test/helpers/builder');

const { describeOnCondition } = require('../utils/test');
const { STAGE_MODEL_UID, WORKFLOW_MODEL_UID } = require('../constants/workflows');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const productUID = 'api::product.product';
const model = {
  draftAndPublish: true,
  pluginOptions: {},
  singularName: 'product',
  pluralName: 'products',
  displayName: 'Product',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
  },
};

describeOnCondition(edition === 'EE')('Review workflows', () => {
  const builder = createTestBuilder();

  const requests = {
    public: null,
    admin: null,
  };
  let strapi;
  let hasRW;
  let defaultStage;
  let secondStage;
  let testWorkflow;

  const createEntry = async (uid, data) => {
    const { body } = await requests.admin({
      method: 'POST',
      url: `/content-manager/collection-types/${uid}`,
      body: data,
    });
    return body;
  };

  const updateContentType = async (uid, data) => {
    const result = await requests.admin({
      method: 'PUT',
      url: `/content-type-builder/content-types/${uid}`,
      body: data,
    });

    expect(result.statusCode).toBe(201);
  };

  const restart = async () => {
    await strapi.destroy();
    strapi = await createStrapiInstance();
    requests.admin = await createAuthRequest({ strapi });
  };

  beforeAll(async () => {
    await builder.addContentTypes([model]).build();
    // eslint-disable-next-line node/no-extraneous-require
    hasRW = require('@strapi/strapi/lib/utils/ee').features.isEnabled('review-workflows');

    strapi = await createStrapiInstance();
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
    await builder.cleanup();
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
      const stagesRes = await requests.public.put(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages`,
        stagesUpdateData
      );
      const workflowRes = await requests.public.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}`
      );

      if (hasRW) {
        expect(stagesRes.status).toBe(401);
        expect(workflowRes.status).toBe(401);
      } else {
        expect(stagesRes.status).toBe(404);
        expect(stagesRes.body.data).toBeUndefined();
        expect(workflowRes.status).toBe(404);
        expect(workflowRes.body.data).toBeUndefined();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const stagesRes = await requests.admin.put(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages`,
        { body: { data: stagesUpdateData } }
      );
      const workflowRes = await requests.admin.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`
      );

      if (hasRW) {
        expect(stagesRes.status).toBe(200);
        expect(stagesRes.body.data).toBeInstanceOf(Object);
        expect(stagesRes.body.data.id).toEqual(testWorkflow.id);
        expect(workflowRes.status).toBe(200);
        expect(workflowRes.body.data).toBeInstanceOf(Object);
        expect(workflowRes.body.data.stages).toBeInstanceOf(Array);
        expect(workflowRes.body.data.stages[0]).toMatchObject(stagesUpdateData[0]);
        expect(workflowRes.body.data.stages[1]).toMatchObject(stagesUpdateData[1]);
        expect(workflowRes.body.data.stages[2]).toMatchObject({
          id: expect.any(Number),
          ...stagesUpdateData[2],
        });
      } else {
        expect(stagesRes.status).toBe(404);
        expect(stagesRes.body.data).toBeUndefined();
        expect(workflowRes.status).toBe(404);
        expect(workflowRes.body.data).toBeUndefined();
      }
    });
    test('It should throw an error if trying to delete all stages in a workflow', async () => {
      const stagesRes = await requests.admin.put(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages`,
        { body: { data: [] } }
      );
      const workflowRes = await requests.admin.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`
      );

      if (hasRW) {
        expect(stagesRes.status).toBe(400);
        expect(stagesRes.body.error).toBeDefined();
        expect(stagesRes.body.error.name).toEqual('ApplicationError');
        expect(stagesRes.body.error.message).toBeDefined();
        expect(workflowRes.status).toBe(200);
        expect(workflowRes.body.data).toBeInstanceOf(Object);
        expect(workflowRes.body.data.stages).toBeInstanceOf(Array);
        expect(workflowRes.body.data.stages[0]).toMatchObject({ id: defaultStage.id });
        expect(workflowRes.body.data.stages[1]).toMatchObject({ id: secondStage.id });
      } else {
        expect(stagesRes.status).toBe(404);
        expect(stagesRes.body.data).toBeUndefined();
        expect(workflowRes.status).toBe(404);
        expect(workflowRes.body.data).toBeUndefined();
      }
    });
  });

  describe('Enabling/Disabling review workflows on a content type', () => {
    let response;

    const getRWMorphTableResults = async (connection) =>
      connection
        .select('*')
        .from('strapi_workflows_stages_related_morphs')
        .where('related_type', productUID);

    beforeAll(async () => {
      await createEntry(productUID, { name: 'Product' });
      await createEntry(productUID, { name: 'Product 1' });
      await createEntry(productUID, { name: 'Product 2' });
    });

    test('when enabled on a content type, entries of this type should be added to the first stage of the workflow', async () => {
      await updateContentType(productUID, {
        components: [],
        contentType: { ...model, reviewWorkflows: true },
      });
      await restart();

      response = await requests.admin({
        method: 'GET',
        url: `/content-type-builder/content-types/api::product.product`,
      });

      expect(response.body.data.schema.reviewWorkflows).toBeTruthy();

      response = await getRWMorphTableResults(strapi.db.getConnection());

      expect(response.length).toEqual(3);
      for (let i = 0; i < response.length; i += 1) {
        const entry = response[i];
        expect(entry.related_id).toEqual(i + 1);
        expect(entry.order).toEqual(1);
      }
    });

    test('when disabled entries in the content type should be removed from any workflow stage', async () => {
      await updateContentType(productUID, {
        components: [],
        contentType: { ...model, reviewWorkflows: false },
      });

      await restart();

      response = await requests.admin({
        method: 'GET',
        url: `/content-type-builder/content-types/api::product.product`,
      });
      expect(response.body.data.schema.reviewWorkflows).toBeFalsy();

      response = await getRWMorphTableResults(strapi.db.getConnection());
      expect(response.length).toEqual(0);
    });
  });
});

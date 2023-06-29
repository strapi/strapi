'use strict';

const { mapAsync } = require('@strapi/utils');

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest, createRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');
const { describeOnCondition } = require('api-tests/utils');

const {
  STAGE_MODEL_UID,
  WORKFLOW_MODEL_UID,
  ENTITY_STAGE_ATTRIBUTE,
} = require('../../../../packages/core/admin/ee/server/constants/workflows');

const defaultStages = require('../../../../packages/core/admin/ee/server/constants/default-stages.json');

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

  const updateEntry = async (uid, id, data) => {
    const { body } = await requests.admin({
      method: 'PUT',
      url: `/content-manager/collection-types/${uid}/${id}`,
      body: data,
    });
    return body;
  };

  const findAll = async (uid) => {
    const { body } = await requests.admin({
      method: 'GET',
      url: `/content-manager/collection-types/${uid}`,
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

  beforeEach(async () => {
    testWorkflow = await strapi.query(WORKFLOW_MODEL_UID).update({
      where: { id: testWorkflow.id },
      data: {
        uid: 'workflow',
        stages: [defaultStage.id, secondStage.id],
      },
    });
    await updateContentType(productUID, {
      components: [],
      contentType: model,
    });
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

    test("It should assign a default color to stages if they don't have one", async () => {
      await requests.admin.put(`/admin/review-workflows/workflows/${testWorkflow.id}/stages`, {
        body: {
          data: [defaultStage, { id: secondStage.id, name: secondStage.name, color: '#000000' }],
        },
      });

      const workflowRes = await requests.admin.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`
      );

      expect(workflowRes.status).toBe(200);
      expect(workflowRes.body.data.stages[0].color).toBe('#4945FF');
      expect(workflowRes.body.data.stages[1].color).toBe('#000000');
    });
    test("It shouldn't be available for public", async () => {
      const stagesRes = await requests.public.put(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages`,
        { body: { data: stagesUpdateData } }
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
    test('It should throw an error if trying to create more than 200 stages', async () => {
      const stagesRes = await requests.admin.put(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages`,
        { body: { data: Array(201).fill({ name: 'new stage' }) } }
      );

      if (hasRW) {
        expect(stagesRes.status).toBe(400);
        expect(stagesRes.body.error).toBeDefined();
        expect(stagesRes.body.error.name).toEqual('ValidationError');
        expect(stagesRes.body.error.message).toBeDefined();
      }
    });
  });

  describe('Enabling/Disabling review workflows on a content type', () => {
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

      const response = await requests.admin({
        method: 'GET',
        url: `/content-type-builder/content-types/api::product.product`,
      });

      expect(response.body.data.schema.reviewWorkflows).toBeTruthy();

      const {
        body: { results },
      } = await requests.admin({
        method: 'GET',
        url: '/content-manager/collection-types/api::product.product',
      });

      expect(results.length).toEqual(3);
      for (let i = 0; i < results.length; i += 1) {
        expect(results[i][ENTITY_STAGE_ATTRIBUTE]).toBeDefined();
      }
    });

    test('when disabled entries in the content type should be removed from any workflow stage', async () => {
      await updateContentType(productUID, {
        components: [],
        contentType: { ...model, reviewWorkflows: false },
      });

      await restart();

      const response = await requests.admin({
        method: 'GET',
        url: `/content-type-builder/content-types/api::product.product`,
      });
      expect(response.body.data.schema.reviewWorkflows).toBeFalsy();

      const {
        body: { results },
      } = await requests.admin({
        method: 'GET',
        url: '/content-manager/collection-types/api::product.product',
      });

      for (let i = 0; i < results.length; i += 1) {
        expect(results[i][ENTITY_STAGE_ATTRIBUTE]).toBeUndefined();
      }
    });
  });

  describe('Update a stage on an entity', () => {
    describe('Review Workflow is enabled', () => {
      beforeAll(async () => {
        await updateContentType(productUID, {
          components: [],
          contentType: { ...model, reviewWorkflows: true },
        });
        await restart();
      });
      test('Should update the accordingly on an entity', async () => {
        const entry = await createEntry(productUID, { name: 'Product' });

        const response = await requests.admin({
          method: 'PUT',
          url: `/admin/content-manager/collection-types/${productUID}/${entry.id}/stage`,
          body: {
            data: { id: secondStage.id },
          },
        });

        expect(response.status).toEqual(200);
        expect(response.body.data[ENTITY_STAGE_ATTRIBUTE]).toEqual(
          expect.objectContaining({ id: secondStage.id })
        );
      });
      test('Should throw an error if stage does not exist', async () => {
        const entry = await createEntry(productUID, { name: 'Product' });

        const response = await requests.admin({
          method: 'PUT',
          url: `/admin/content-manager/collection-types/${productUID}/${entry.id}/stage`,
          body: {
            data: { id: 1234 },
          },
        });

        expect(response.status).toEqual(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.name).toEqual('ApplicationError');
        expect(response.body.error.message).toEqual('Selected stage does not exist');
      });
    });
    describe('Review Workflow is disabled', () => {
      beforeAll(async () => {
        await updateContentType(productUID, {
          components: [],
          contentType: { ...model, reviewWorkflows: false },
        });
        await restart();
      });
      test('Should not update the entity', async () => {
        const entry = await createEntry(productUID, { name: 'Product' });

        const response = await requests.admin({
          method: 'PUT',
          url: `/admin/content-manager/collection-types/${productUID}/${entry.id}/stage`,
          body: {
            data: { id: secondStage.id },
          },
        });

        expect(response.status).toEqual(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.name).toBe('ApplicationError');
      });
    });
  });

  describe('Creating an entity in a review workflow content type', () => {
    beforeAll(async () => {
      await updateContentType(productUID, {
        components: [],
        contentType: { ...model, reviewWorkflows: true },
      });
      await restart();
    });

    test('when review workflows is enabled on a content type, new entries should be added to the first stage of the default workflow', async () => {
      const adminResponse = await createEntry(productUID, { name: 'Product' });
      expect(await adminResponse[ENTITY_STAGE_ATTRIBUTE].name).toEqual(defaultStages[0].name);
    });
  });

  //FIXME Flaky test
  describe.skip('Deleting a stage when content already exists', () => {
    test('When content exists in a review stage and this stage is deleted, the content should be moved to the nearest available stage', async () => {
      const products = await findAll(productUID);

      // Move half of the entries to the last stage,
      // and the other half to the first stage
      await mapAsync(products.results, async (entity) =>
        updateEntry(productUID, entity.id, {
          [ENTITY_STAGE_ATTRIBUTE]: entity.id % 2 ? defaultStage.id : secondStage.id,
        })
      );

      // Delete last stage stage of the default workflow
      await requests.admin.put(`/admin/review-workflows/workflows/${testWorkflow.id}/stages`, {
        body: { data: [defaultStage] },
      });

      // Expect the content in these stages to be moved to the nearest available stage
      const productsAfter = await findAll(productUID);
      for (const entry of productsAfter.results) {
        expect(entry[ENTITY_STAGE_ATTRIBUTE].name).toEqual(defaultStage.name);
      }
    });
  });
});

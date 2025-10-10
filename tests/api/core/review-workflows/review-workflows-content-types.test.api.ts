'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition } from 'api-tests/utils';

import {
  WORKFLOW_MODEL_UID,
  ENTITY_STAGE_ATTRIBUTE,
} from '../../../../packages/core/review-workflows/server/src/constants/workflows';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const baseWorkflow = {
  name: 'testWorkflow',
  stages: [{ name: 'Todo' }, { name: 'Done' }],
};

const productUID = 'api::product.product';
const productModel = {
  pluginOptions: {},
  draftAndPublish: true,
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

const articleUID = 'api::article.article';
const articleModel = {
  pluginOptions: {},
  draftAndPublish: true,
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  kind: 'collectionType',
  attributes: {
    title: {
      type: 'string',
    },
  },
};

const dogUID = 'api::dog.dog';
const dogModel = {
  pluginOptions: {},
  draftAndPublish: true,
  singularName: 'dog',
  pluralName: 'dogs',
  displayName: 'Dog',
  kind: 'collectionType',
  attributes: {
    name: { type: 'string' },
  },
};

// TODO: V5 fix review workflows
describeOnCondition(edition === 'EE')('Review workflows - Content Types', () => {
  const builder = createTestBuilder();

  const requests = { admin: null };
  let strapi;

  const createWorkflow = async (data) => {
    const name = `workflow-${Math.random().toString(36)}`;
    return requests.admin.post('/review-workflows/workflows?populate=*', {
      body: { data: { ...baseWorkflow, name, ...data } },
    });
  };

  const updateWorkflow = async (id, data) => {
    return requests.admin.put(`/review-workflows/workflows/${id}?populate=stages`, {
      body: { data },
    });
  };

  const deleteWorkflow = async (id) => {
    return requests.admin.delete(`/review-workflows/workflows/${id}`);
  };

  const getWorkflow = async (id) => {
    const { body } = await requests.admin.get(`/review-workflows/workflows?populate=*`);
    return body.data.find((workflow) => workflow.id === id);
  };

  const getWorkflows = async (filters) => {
    const result = await requests.admin({
      method: 'GET',
      url: '/review-workflows/workflows',
      qs: { filters },
    });
    return result.body.data;
  };

  const createEntry = async (uid, data) => {
    const { body } = await requests.admin({
      method: 'POST',
      url: `/content-manager/collection-types/${uid}`,
      body: data,
    });
    return body.data;
  };

  const findAll = async (uid) => {
    const { body } = await requests.admin({
      method: 'GET',
      url: `/content-manager/collection-types/${uid}`,
    });
    return body;
  };

  beforeAll(async () => {
    await builder.addContentTypes([productModel, articleModel, dogModel]).build();

    strapi = await createStrapiInstance();
    requests.admin = await createAuthRequest({ strapi });

    // Create products
    await Promise.all([
      createEntry(productUID, { name: 'Product 1' }),
      createEntry(productUID, { name: 'Product 2' }),
    ]);

    // Create articles
    await Promise.all([
      createEntry(articleUID, { title: 'Article 1' }),
      createEntry(articleUID, { title: 'Article 2' }),
    ]);

    // Create dogs
    await Promise.all([
      createEntry(dogUID, { name: 'Dog 1' }),
      createEntry(dogUID, { name: 'Dog 2' }),
    ]);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Create workflow', () => {
    let workflow1, workflow2;

    describe('Create workflow and assign content type', () => {
      test('It should create a workflow and assign a content type', async () => {
        const res = await createWorkflow({ name: 'test-workflow', contentTypes: [productUID] });

        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({
          name: expect.any(String),
          contentTypes: [productUID],
        });
        workflow1 = res.body.data;
      });

      test('All product entities should have the first stage', async () => {
        const products = await findAll(productUID);

        expect(products.results).toHaveLength(2);
        for (const product of products.results) {
          expect(product[ENTITY_STAGE_ATTRIBUTE].id).toBe(workflow1.stages[0].id);
        }
      });
    });

    describe('Create workflow and steal content type from another workflow', () => {
      test('It should create workflow stealing content type from another', async () => {
        const res = await createWorkflow({
          contentTypes: [productUID],
          stages: [{ name: 'Review' }],
        });

        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({ contentTypes: [productUID] });
        workflow2 = res.body.data;
      });

      test('All product entities should have the new first stage', async () => {
        const products = await findAll(productUID);

        expect(products.results).toHaveLength(2);
        for (const product of products.results) {
          expect(product[ENTITY_STAGE_ATTRIBUTE].id).toBe(workflow2.stages[0].id);
        }
      });

      test('Original workflow should be updated', async () => {
        const workflow = await getWorkflow(workflow1.id);
        expect(workflow).toMatchObject({ contentTypes: [] });
      });
    });

    test("It shouldn't create a workflow with invalid content type", async () => {
      const res = await createWorkflow({ contentTypes: ['someUID'] });
      expect(res.status).toBe(400);
    });

    test('It should create a workflow with a required stage to publish', async () => {
      const res = await createWorkflow({
        contentTypes: [dogUID],
        stages: [{ name: 'Review' }, { name: 'Done' }],
        stageRequiredToPublishName: 'Done',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ contentTypes: [dogUID] });

      const dogs = await findAll(dogUID);
      expect(dogs.results).toHaveLength(2);

      const dog = dogs.results[0];

      // If we try to publish, should fail because is not at the required stage
      const publishRes = await requests.admin({
        method: 'POST',
        url: `/content-manager/collection-types/${dogUID}/${dog.documentId}/actions/publish`,
      });
      expect(publishRes.status).toBe(400);

      const reviewRes = await requests.admin({
        method: 'PUT',
        url: `/review-workflows/content-manager/collection-types/${dogUID}/${dog.documentId}/stage`,
        body: { data: { id: res.body.data.stages[1].id } },
      });
      expect(reviewRes.status).toBe(200);

      // Publish
      const publishRes2 = await requests.admin({
        method: 'POST',
        url: `/content-manager/collection-types/${dogUID}/${dog.documentId}/actions/publish`,
      });
      expect(publishRes2.status).toBe(200);
    });
  });

  describe('Update workflow', () => {
    let workflow1, workflow2;

    describe('Basic update', () => {
      test('It should assign a content type', async () => {
        workflow1 = await createWorkflow({ contentTypes: [] }).then((res) => res.body.data);

        const res = await updateWorkflow(workflow1.id, {
          contentTypes: [productUID],
        });

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ contentTypes: [productUID] });
      });

      test('All product entities should have the first stage', async () => {
        const products = await findAll(productUID);

        expect(products.results).toHaveLength(2);
        for (const product of products.results) {
          expect(product[ENTITY_STAGE_ATTRIBUTE].id).toBe(workflow1.stages[0].id);
        }
      });
    });

    // Depends on the previous test
    describe('Steal content type', () => {
      test('It should be able to steal a content type from another workflow', async () => {
        workflow2 = await createWorkflow({ contentTypes: [] }).then((res) => res.body.data);
        const res = await updateWorkflow(workflow2.id, { contentTypes: [productUID] });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ contentTypes: [productUID] });
      });

      test('All product entities should have the new first stage', async () => {
        const products = await findAll(productUID);

        expect(products.results).toHaveLength(2);
        for (const product of products.results) {
          expect(product[ENTITY_STAGE_ATTRIBUTE].id).toBe(workflow2.stages[0].id);
        }
      });

      test('Original workflow should be updated', async () => {
        const workflow = await getWorkflow(workflow1.id);
        expect(workflow).toMatchObject({ contentTypes: [] });
      });
    });

    // Depends on the previous test
    describe('Unassign content type', () => {
      test('It should unassign content type', async () => {
        const res = await updateWorkflow(workflow2.id, { contentTypes: [] });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ contentTypes: [] });
      });

      test('All product entities should have null stage', async () => {
        const products = await findAll(productUID);

        expect(products.results).toHaveLength(2);
        for (const product of products.results) {
          expect(product[ENTITY_STAGE_ATTRIBUTE]).toBeNull();
        }
      });
    });

    // Depends on the previous test
    describe('Assign multiple content types', () => {
      test('It should assign multiple content types', async () => {
        const res = await updateWorkflow(workflow1.id, {
          contentTypes: [productUID, articleUID],
        });

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ contentTypes: [productUID, articleUID] });
      });

      test('It should steal content types from other workflows', async () => {
        // There could be concurrency issues, so assert all workflows are transferred
        const res = await updateWorkflow(workflow2.id, {
          contentTypes: [productUID, articleUID],
        });

        const updatedWorkflow1 = await getWorkflow(workflow1.id);

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ contentTypes: [productUID, articleUID] });

        expect(updatedWorkflow1).toMatchObject({ contentTypes: [] });
      });
    });

    describe('Assign and update stages', () => {
      test('It should assign and update stages', async () => {
        workflow1 = await createWorkflow({ contentTypes: [] }).then((res) => res.body.data);

        // Update stages
        const res = await updateWorkflow(workflow1.id, {
          contentTypes: [productUID],
          stages: [{ id: workflow1.stages[0].id, name: 'Review' }],
        });

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
          contentTypes: [productUID],
          stages: [{ name: 'Review' }],
        });
      });

      test('All product entities should have the new first stage', async () => {
        const products = await findAll(productUID);

        expect(products.results).toHaveLength(2);
        for (const product of products.results) {
          expect(product[ENTITY_STAGE_ATTRIBUTE].id).toBe(workflow1.stages[0].id);
          expect(product[ENTITY_STAGE_ATTRIBUTE].name).toBe('Review');
        }
      });
    });
  });

  describe('Delete workflow', () => {
    let workflow;
    test('It should delete the workflow', async () => {
      workflow = await createWorkflow({ contentTypes: [productUID] }).then((res) => res.body.data);

      const res = await deleteWorkflow(workflow.id);
      expect(res.status).toBe(200);
    });

    // Depends on the previous test
    test('All entities should have null stage', async () => {
      const products = await findAll(productUID);

      expect(products.results).toHaveLength(2);
      for (const product of products.results) {
        expect(product[ENTITY_STAGE_ATTRIBUTE]).toBeNull();
      }
    });
  });

  describe('Creating entity assigned to a workflow', () => {
    let workflow;
    test('When content type is assigned to workflow, new entries should be added to the first stage of the default workflow', async () => {
      // Create a workflow with product content type
      workflow = await createWorkflow({ contentTypes: [productUID] }).then((res) => res.body.data);

      const entry = await createEntry(productUID, { name: 'Product' });
      expect(await entry[ENTITY_STAGE_ATTRIBUTE].id).toEqual(workflow.stages[0].id);
    });

    // Depends on the previous test
    test('When content type is not assigned to workflow, new entries should have a null stage', async () => {
      // Unassign product content type from default workflow
      await updateWorkflow(workflow.id, { contentTypes: [] });

      const entry = await createEntry(productUID, { name: 'Product' });
      expect(await entry[ENTITY_STAGE_ATTRIBUTE]).toBeNull();
    });
  });

  describe('Get workflows', () => {
    let workflow1, workflow2;

    beforeEach(async () => {
      workflow1 = await createWorkflow({ contentTypes: [] }).then((res) => res.body.data);
      workflow2 = await createWorkflow({ contentTypes: [productUID] }).then((res) => res.body.data);
    });

    test('Should list workflows filtered by CT', async () => {
      const workflows = await getWorkflows({ contentTypes: productUID });

      expect(workflows).toHaveLength(1);
      expect(workflows[0]).toMatchObject({ id: workflow2.id });
    });

    // Depends on the previous test
    test('Should list workflows filtered by CT even with similar names (plugin::my-plugin.my-ct and plugin::my-plugin.my-ct2)', async () => {
      // Manually update workflow to have a similar CT name
      await strapi.db.query(WORKFLOW_MODEL_UID).update({
        where: { id: workflow1.id },
        data: { contentTypes: [`${productUID}-2`] },
      });

      const workflows = await getWorkflows({ contentTypes: productUID });

      expect(workflows).toHaveLength(1);
      expect(workflows[0]).toMatchObject({ id: workflow2.id });

      // To avoid breaking other tests
      await strapi.db.query(WORKFLOW_MODEL_UID).update({
        where: { id: workflow1.id },
        data: { contentTypes: [] },
      });
    });
  });
});

'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest, createRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');
const { describeOnCondition } = require('api-tests/utils');

const {
  STAGE_MODEL_UID,
  WORKFLOW_MODEL_UID,
  ENTITY_STAGE_ATTRIBUTE,
} = require('../../../../packages/core/admin/ee/server/constants/workflows');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const baseWorkflow = {
  name: 'testWorkflow',
  stages: [{ name: 'Todo' }, { name: 'Done' }],
};

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
    },
  },
};

const categoryUID = 'api::category.category';
const categoryModel = {
  draftAndPublish: true,
  pluginOptions: {},
  singularName: 'category',
  pluralName: 'categories',
  displayName: 'Category',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
  },
};

describeOnCondition(edition === 'EE')('Review workflows', () => {
  const builder = createTestBuilder();

  const requests = { admin: null };
  let strapi;

  const createWorkflow = async (data) => {
    return requests.admin.post('/admin/review-workflows/workflows?populate=*', {
      body: { ...baseWorkflow, ...data },
    });
  };

  const updateWorkflow = async (id, data) => {
    return requests.admin.put(`/admin/review-workflows/workflows/${id}?populate=stages`, {
      body: data,
    });
  };

  const getWorkflow = async (id) => {
    const { body } = await requests.admin.get(`/admin/review-workflows/workflows/${id}?populate=*`);
    return body.data;
  };

  const getWorkflows = async (filters) => {
    const result = await requests.admin({
      method: 'GET',
      url: '/admin/review-workflows/workflows',
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

  beforeAll(async () => {
    await builder.addContentTypes([productModel, categoryModel]).build();

    strapi = await createStrapiInstance();
    requests.admin = await createAuthRequest({ strapi });

    await Promise.all([
      createEntry(productUID, { name: 'Product 1' }),
      createEntry(productUID, { name: 'Product 2' }),
      createEntry(categoryUID, { name: 'Category 1' }),
      createEntry(categoryUID, { name: 'Category 2' }),
    ]);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {});

  describe('Create workflow', () => {
    let workflow1, workflow2;

    describe('Basic', () => {
      test('Can create and assign a content type', async () => {
        const res = await createWorkflow({ contentTypes: [productUID] });

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ contentTypes: [productUID] });
        workflow1 = res.body.data;
      });

      test('All product entities have the first stage', async () => {
        const products = await findAll(productUID);

        expect(products.results).toHaveLength(2);
        for (const product of products.results) {
          expect(product[ENTITY_STAGE_ATTRIBUTE].id).toBe(workflow1.stages[0].id);
        }
      });
    });

    describe('Steal content type', () => {
      test('Can create stealing content type from another', async () => {
        const res = await createWorkflow({
          contentTypes: [productUID],
          stages: [{ name: 'Review' }],
        });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ contentTypes: [productUID] });
        workflow2 = res.body.data;
      });

      test('All product entities have the new first stage', async () => {
        const products = await findAll(productUID);

        expect(products.results).toHaveLength(2);
        for (const product of products.results) {
          expect(product[ENTITY_STAGE_ATTRIBUTE].id).toBe(workflow2.stages[0].id);
        }
      });

      test('Original workflow is updated', async () => {
        const workflow = await getWorkflow(workflow1.id);
        expect(workflow).toMatchObject({ contentTypes: [] });
      });
    });

    test('Can not create with invalid content type', async () => {
      const res = await createWorkflow({ contentTypes: ['someUID'] });
      expect(res.status).toBe(400);
    });
  });

  describe('Update workflow', () => {
    let workflow1, workflow2;

    describe('Basic update', () => {
      test('Can assign a content type', async () => {
        workflow1 = await createWorkflow({ contentTypes: [] }).then((res) => res.body.data);

        const res = await updateWorkflow(workflow1.id, {
          contentTypes: [productUID],
        });

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ contentTypes: [productUID] });
      });

      test('All product entities have the first stage', async () => {
        const products = await findAll(productUID);

        expect(products.results).toHaveLength(2);
        for (const product of products.results) {
          expect(product[ENTITY_STAGE_ATTRIBUTE].id).toBe(workflow1.stages[0].id);
        }
      });
    });

    // Depends on the previous test
    describe('Steal content type', () => {
      test('Can steal content type from another', async () => {
        workflow2 = await createWorkflow({ contentTypes: [] }).then((res) => res.body.data);
        const res = await updateWorkflow(workflow2.id, { contentTypes: [productUID] });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ contentTypes: [productUID] });
      });

      test('All product entities have the new first stage', async () => {
        const products = await findAll(productUID);

        expect(products.results).toHaveLength(2);
        for (const product of products.results) {
          expect(product[ENTITY_STAGE_ATTRIBUTE].id).toBe(workflow2.stages[0].id);
        }
      });

      test('Original workflow is updated', async () => {
        const workflow = await getWorkflow(workflow1.id);
        expect(workflow).toMatchObject({ contentTypes: [] });
      });
    });

    // Depends on the previous test
    describe('Unassign content type', () => {
      test('Can unassign content type', async () => {
        const res = await updateWorkflow(workflow2.id, { contentTypes: [] });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ contentTypes: [] });
      });

      test('All product entities have null stage', async () => {
        const products = await findAll(productUID);

        expect(products.results).toHaveLength(2);
        for (const product of products.results) {
          expect(product[ENTITY_STAGE_ATTRIBUTE]).toBeNull();
        }
      });
    });

    describe('Assign and update stages', () => {
      test('Can assign and update stages', async () => {
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

      test('All product entities have the new first stage', async () => {
        const products = await findAll(productUID);

        expect(products.results).toHaveLength(2);
        for (const product of products.results) {
          expect(product[ENTITY_STAGE_ATTRIBUTE].id).toBe(workflow1.stages[0].id);
          expect(product[ENTITY_STAGE_ATTRIBUTE].name).toBe('Review');
        }
      });
    });

    test('Can not create with invalid content type', async () => {
      const res = await createWorkflow({ contentTypes: ['someUID'] });
      expect(res.status).toBe(400);
    });
  });

  describe('Get workflows', () => {
    let workflow1, workflow2;

    beforeEach(async () => {
      workflow1 = await createWorkflow({ contentTypes: [] }).then((res) => res.body.data);
      workflow2 = await createWorkflow({ contentTypes: [productUID] }).then((res) => res.body.data);
    });

    test('Can get list of workflows filtered by CT', async () => {
      const workflows = await getWorkflows({ contentTypes: { $contains: [productUID] } });

      expect(workflows).toHaveLength(1);
      expect(workflows[0]).toMatchObject({ id: workflow2.id });
    });

    // Depends on the previous test
    test('Filter works ok with similar CT names (plugin::my-plugin.my-ct and plugin::my-plugin.my-ct2)', async () => {
      // Manually update workflow to have a similar CT name
      await strapi.db.query(WORKFLOW_MODEL_UID).update({
        where: { id: workflow1.id },
        data: { contentTypes: [`${productUID}-2`] },
      });

      // FIXME: This filter should be { $contains: [productUID] }
      const workflows = await getWorkflows({ contentTypes: { $contains: [`"${productUID}"`] } });

      expect(workflows).toHaveLength(1);
      expect(workflows[0]).toMatchObject({ id: workflow2.id });
    });
  });
});

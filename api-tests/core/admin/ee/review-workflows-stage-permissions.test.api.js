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
  options: {
    reviewWorkflows: true,
  },
};

describeOnCondition(edition === 'EE')('Review workflows', () => {
  const builder = createTestBuilder();

  let strapi;
  let workflow;
  let rq;
  let roles;

  const createWorkflow = async (data) => {
    const name = `workflow-${Math.random().toString(36)}`;
    const req = await rq.post('/admin/review-workflows/workflows?populate=*', {
      body: { data: { name, ...data } },
    });
    return req.body.data;
  };

  const updateWorkflow = async (id, data) => {
    const req = await rq.put(`/admin/review-workflows/workflows/${id}?populate=stages`, {
      body: { data },
    });

    return req.body.data;
  };

  const deleteWorkflow = async (id) => {
    return rq.delete(`/admin/review-workflows/workflows/${id}`);
  };

  const getWorkflow = async (id) => {
    const { body } = await rq.get(`/admin/review-workflows/workflows/${id}?populate=*`);
    return body.data;
  };

  beforeAll(async () => {
    await builder.addContentTypes([model]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    workflow = await createWorkflow({
      name: 'test-workflow',
      contentTypes: [productUID],
      stages: [{ name: 'Stage 1' }, { name: 'Stage 2' }],
    });

    // Get default roles
    const { body } = await rq.get('/admin/roles');
    roles = body.data;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Assign workflow permissions', () => {
    // Create stage with permissions
    test('Update stage with new permissions', async () => {
      workflow = await updateWorkflow(workflow.id, {
        stages: [
          {
            ...workflow.stages[0],
            permissions: [
              {
                action: 'admin::review-workflows.stage.transition',
                role: roles[0].id,
              },
              {
                action: 'admin::review-workflows.stage.transition',
                role: roles[1].id,
              },
            ],
          },
          workflow.stages[1],
        ],
      });

      expect(workflow.stages[0].permissions).toHaveLength(2);
    });
  });
});

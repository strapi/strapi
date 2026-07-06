'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition } from 'api-tests/utils';

import {
  WORKFLOW_MODEL_UID,
  STAGE_MODEL_UID,
} from '../../../../packages/core/review-workflows/server/src/constants/workflows';
import { getWorkflowContentTypeFilter } from '../../../../packages/core/review-workflows/server/src/utils/review-workflows';

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

describeOnCondition(edition === 'EE')('Review workflows - Filter by content type', () => {
  const builder = createTestBuilder();

  const requests = { admin: null };
  let strapi;

  const createWorkflow = async (data) => {
    const name = `workflow-${Math.random().toString(36)}`;
    return requests.admin.post('/review-workflows/workflows?populate=*', {
      body: { data: { ...baseWorkflow, name, ...data } },
    });
  };

  const getWorkflows = async (contentTypeUID) => {
    const result = await requests.admin({
      method: 'GET',
      url: '/review-workflows/workflows',
      qs: {
        filters: {
          contentTypes: getWorkflowContentTypeFilter({ strapi }, contentTypeUID),
        },
      },
    });
    return result.body.data;
  };

  const resetWorkflows = async () => {
    await strapi.db.query(STAGE_MODEL_UID).deleteMany({});
    await strapi.db.query(WORKFLOW_MODEL_UID).deleteMany({});
  };

  beforeAll(async () => {
    await builder.addContentTypes([productModel]).build();

    strapi = await createStrapiInstance();
    requests.admin = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Get workflows', () => {
    let workflow1, workflow2;

    beforeEach(async () => {
      await resetWorkflows();

      const res1 = await createWorkflow({ contentTypes: [] });
      expect(res1.status).toBe(201);
      workflow1 = res1.body.data;

      const res2 = await createWorkflow({ contentTypes: [productUID] });
      expect(res2.status).toBe(201);
      expect(res2.body.data.contentTypes).toEqual([productUID]);
      workflow2 = res2.body.data;
    });

    test('Should list workflows filtered by CT', async () => {
      const workflows = await getWorkflows(productUID);

      expect(workflows).toHaveLength(1);
      expect(workflows[0]).toMatchObject({ id: workflow2.id });
    });

    test('Should list workflows filtered by CT even with similar names (plugin::my-plugin.my-ct and plugin::my-plugin.my-ct2)', async () => {
      await strapi.db.query(WORKFLOW_MODEL_UID).update({
        where: { id: workflow1.id },
        data: { contentTypes: [`${productUID}-2`] },
      });

      const workflows = await getWorkflows(productUID);

      expect(workflows).toHaveLength(1);
      expect(workflows[0]).toMatchObject({ id: workflow2.id });
    });
  });
});

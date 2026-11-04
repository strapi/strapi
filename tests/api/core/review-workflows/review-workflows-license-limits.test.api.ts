'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition } from 'api-tests/utils';

import {
  ERRORS,
  STAGE_MODEL_UID,
  WORKFLOW_MODEL_UID,
} from '../../../../packages/core/review-workflows/server/src/constants/workflows';
import defaultStages from '../../../../packages/core/review-workflows/server/src/constants/default-stages.json';
import defaultWorkflow from '../../../../packages/core/review-workflows/server/src/constants/default-workflow.json';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

// Lower than the 200 default, and high enough for the 4 stages of the default workflow
const LICENSE_LIMITS = { numberOfWorkflows: 5, stagesPerWorkflow: 5 };

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

/**
 * Serves the review workflows license feature with low limits, in the shape the license uses.
 * `strapi.ee` is frozen, so the instance getter is shadowed before the plugins register.
 */
const withReviewWorkflowsLimits = ({ strapi }) => {
  const ee = strapi.ee;
  const getFeature = (name: string) =>
    name === 'review-workflows' ? { name, options: LICENSE_LIMITS } : ee.features.get(name);
  const features = {
    list: ee.features.list,
    get: getFeature,
    isEnabled: (name: string) => getFeature(name) !== undefined,
  };

  Object.defineProperty(strapi, 'ee', {
    get: () => new Proxy({}, { get: (_, key) => (key === 'features' ? features : ee[key]) }),
  });
};

describeOnCondition(edition === 'EE')('Review workflows license limits', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;

  const createWorkflow = (name: string, stageCount = 1) =>
    rq.post('/review-workflows/workflows', {
      body: {
        data: {
          name,
          stages: Array.from({ length: stageCount }, (_, index) => ({ name: `Stage ${index}` })),
        },
      },
    });

  const updateWorkflow = (id: number, data: Record<string, unknown>) =>
    rq.put(`/review-workflows/workflows/${id}`, { body: { data } });

  // The test DB is shared across the review workflows API files
  const deleteAllWorkflows = async () => {
    await strapi.db.query(STAGE_MODEL_UID).deleteMany({});
    await strapi.db.query(WORKFLOW_MODEL_UID).deleteMany({});
  };

  beforeAll(async () => {
    await builder.addContentTypes([productModel]).build();

    strapi = await createStrapiInstance({ register: withReviewWorkflowsLimits });
    rq = await createAuthRequest({ strapi });

    await deleteAllWorkflows();
  });

  afterAll(async () => {
    // Restore the default workflow the bootstrap creates, for the next test files
    await deleteAllWorkflows();
    await strapi
      .plugin('review-workflows')
      .service('workflows')
      .create({ data: { ...defaultWorkflow, contentTypes: [], stages: defaultStages } });

    await strapi.destroy();
    await builder.cleanup();
  });

  test('It rejects a workflow with more stages than the license allows', async () => {
    const res = await createWorkflow('too-many-stages', LICENSE_LIMITS.stagesPerWorkflow + 1);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(ERRORS.STAGES_LIMIT);
  });

  describe('At the license workflow limit', () => {
    let workflow;

    beforeAll(async () => {
      await deleteAllWorkflows();

      const res = await createWorkflow('within-limit-0', 2);
      expect(res.status).toBe(201);
      workflow = res.body.data;
    });

    test('It creates workflows up to exactly the limit and rejects one more', async () => {
      for (let index = 1; index < LICENSE_LIMITS.numberOfWorkflows; index += 1) {
        const res = await createWorkflow(`within-limit-${index}`);
        expect(res.status).toBe(201);
      }

      expect(await strapi.db.query(WORKFLOW_MODEL_UID).count()).toBe(
        LICENSE_LIMITS.numberOfWorkflows
      );

      const res = await createWorkflow('above-limit');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe(ERRORS.WORKFLOWS_LIMIT);
    });

    test('It updates a workflow', async () => {
      const res = await updateWorkflow(workflow.id, {
        name: 'renamed-at-limit',
        contentTypes: [productUID],
      });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('renamed-at-limit');
    });
  });

  // An instance that created more workflows than its plan allows, while the limit was not enforced
  describe('Above the license workflow limit', () => {
    let workflow;
    let otherWorkflow;

    beforeAll(async () => {
      await deleteAllWorkflows();

      const res = await createWorkflow('over-limit-0', 2);
      expect(res.status).toBe(201);
      workflow = res.body.data;

      const otherRes = await createWorkflow('over-limit-other', 2);
      expect(otherRes.status).toBe(201);
      otherWorkflow = otherRes.body.data;

      const updateRes = await updateWorkflow(workflow.id, { contentTypes: [productUID] });
      expect(updateRes.status).toBe(200);

      for (let index = 2; index <= LICENSE_LIMITS.numberOfWorkflows; index += 1) {
        await strapi.db.query(WORKFLOW_MODEL_UID).create({
          data: { name: `over-limit-${index}`, contentTypes: [] },
        });
      }

      expect(await strapi.db.query(WORKFLOW_MODEL_UID).count()).toBeGreaterThan(
        LICENSE_LIMITS.numberOfWorkflows
      );
    });

    test('It changes the stage of an entry', async () => {
      const { body: entry } = await rq.post(`/content-manager/collection-types/${productUID}`, {
        body: { name: 'Product' },
      });
      const secondStage = workflow.stages[1];

      const res = await rq.put(
        `/review-workflows/content-manager/collection-types/${productUID}/${entry.data.documentId}/stage`,
        { body: { data: { id: secondStage.id } } }
      );

      expect(res.status).toBe(200);
      expect(res.body.data.strapi_stage.id).toBe(secondStage.id);
    });

    test('It updates a workflow', async () => {
      const res = await updateWorkflow(workflow.id, { name: 'renamed-over-limit' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('renamed-over-limit');
    });

    // Moves the entries of the content type to the first stage of the other workflow
    test('It reassigns a content type to another workflow', async () => {
      const res = await updateWorkflow(otherWorkflow.id, { contentTypes: [productUID] });

      expect(res.status).toBe(200);
      expect(res.body.data.contentTypes).toEqual([productUID]);
    });

    // Moves the entries of the deleted stage to the remaining stage
    test('It deletes a stage of a workflow', async () => {
      const [firstStage] = otherWorkflow.stages;

      const res = await updateWorkflow(otherWorkflow.id, {
        stages: [{ id: firstStage.id, name: firstStage.name }],
      });

      expect(res.status).toBe(200);
      expect(res.body.data.stages.map((stage) => stage.id)).toEqual([firstStage.id]);
    });

    test('It rejects a new workflow', async () => {
      const res = await createWorkflow('another-over-limit');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe(ERRORS.WORKFLOWS_LIMIT);
    });
  });
});

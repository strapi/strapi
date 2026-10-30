'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { describeOnCondition } from 'api-tests/utils';

import {
  ERRORS,
  WORKFLOW_MODEL_UID,
} from '../../../../packages/core/review-workflows/server/src/constants/workflows';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

// Lower than the 200 default, and high enough for the 4 stages of the default workflow
const LICENSE_LIMITS = { numberOfWorkflows: 5, stagesPerWorkflow: 5 };

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
  let strapi;
  let rq;
  const createdWorkflowIds: number[] = [];

  const createWorkflow = async (name: string, stageCount = 1) => {
    const res = await rq.post('/review-workflows/workflows', {
      body: {
        data: {
          name,
          stages: Array.from({ length: stageCount }, (_, index) => ({ name: `Stage ${index}` })),
        },
      },
    });

    if (res.status === 201) {
      createdWorkflowIds.push(res.body.data.id);
    }

    return res;
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance({ register: withReviewWorkflowsLimits });
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    for (const id of createdWorkflowIds) {
      await rq.delete(`/review-workflows/workflows/${id}`);
    }

    await strapi.destroy();
  });

  test('It rejects a workflow with more stages than the license allows', async () => {
    const res = await createWorkflow('too-many-stages', LICENSE_LIMITS.stagesPerWorkflow + 1);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(ERRORS.STAGES_LIMIT);
  });

  test('It rejects a workflow above the license workflow limit', async () => {
    const existingCount = await strapi.db.query(WORKFLOW_MODEL_UID).count();
    expect(existingCount).toBeLessThan(LICENSE_LIMITS.numberOfWorkflows);

    for (let index = existingCount; index < LICENSE_LIMITS.numberOfWorkflows; index += 1) {
      const res = await createWorkflow(`within-limit-${index}`);
      expect(res.status).toBe(201);
    }

    const res = await createWorkflow('above-limit');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(ERRORS.WORKFLOWS_LIMIT);
  });
});

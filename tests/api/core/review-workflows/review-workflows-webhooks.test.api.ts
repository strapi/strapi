import { omit } from 'lodash/fp';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition, createUtils } from 'api-tests/utils';

import {
  STAGE_MODEL_UID,
  WORKFLOW_MODEL_UID,
} from '../../../../packages/core/review-workflows/server/src/constants/workflows';
import { WORKFLOW_UPDATE_STAGE } from '../../../../packages/core/review-workflows/server/src/constants/webhook-events';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const productUID = 'api::product.product';
const model = {
  pluginOptions: {},
  draftAndPublish: false,
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
  let rq;
  let strapi;
  let stageA;
  let stageB;
  let workflow;

  const createEntry = async (uid, data) => {
    const { body } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${uid}`,
      body: data,
    });

    return body.data;
  };

  beforeAll(async () => {
    await builder.addContentTypes([model]).build();

    // @ts-expect-error - We don't have the type for this
    strapi = await createStrapiInstance({ bypassAuth: false });
    rq = await createAuthRequest({ strapi });

    stageA = await strapi.db.query(STAGE_MODEL_UID).create({
      data: { name: 'Stage A' },
    });
    stageB = await strapi.db.query(STAGE_MODEL_UID).create({
      data: { name: 'Stage B' },
    });
    workflow = await strapi.db.query(WORKFLOW_MODEL_UID).create({
      data: {
        contentTypes: [],
        name: 'workflow',
        stages: [stageA.id, stageB.id],
      },
    });

    // Update workflow to assign product content type
    await rq.put(`/review-workflows/workflows/${workflow.id}?populate=*`, {
      body: { data: { contentTypes: [productUID] } },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test(`Updating entity stage should trigger ${WORKFLOW_UPDATE_STAGE}`, async () => {
    expect.hasAssertions();

    const entry = await createEntry(productUID, { name: 'Product' });

    strapi.eventHub.on(WORKFLOW_UPDATE_STAGE, (payload) => {
      expect(payload).toMatchObject({
        entity: {
          documentId: entry.documentId,
          id: entry.id,
          status: 'draft',
          locale: entry.locale,
        },
        model: 'product',
        uid: productUID,
        workflow: {
          id: workflow.id,
          stages: {
            from: {
              id: stageA.id,
              name: stageA.name,
            },
            to: {
              id: stageB.id,
              name: stageB.name,
            },
          },
        },
      });
    });

    await rq({
      method: 'PUT',
      url: `/review-workflows/content-manager/collection-types/${productUID}/${entry.documentId}/stage`,
      body: {
        data: { id: stageB.id },
      },
      qs: { locale: entry.locale },
    });
  });
});

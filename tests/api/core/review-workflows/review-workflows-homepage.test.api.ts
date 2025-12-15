import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { describeOnCondition } from 'api-tests/utils';
import {
  STAGE_MODEL_UID,
  WORKFLOW_MODEL_UID,
} from '../../../../packages/core/review-workflows/server/src/constants/workflows';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const testBuilder = createTestBuilder();
let strapi;
let rq;

const articleUid = 'api::article.article';
const articleModel = {
  kind: 'collectionType',
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    content: {
      type: 'blocks',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

/**
 * Testing the Homepage API endpoints of the Review Workflows package.
 */
describeOnCondition(edition === 'EE')('Review Workflows Homepage API', () => {
  let defaultStage;
  let secondStage;
  let testWorkflow;

  beforeAll(async () => {
    await testBuilder.addContentTypes([articleModel]).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    defaultStage = await strapi.db.query(STAGE_MODEL_UID).create({
      data: { name: 'Stage' },
    });
    secondStage = await strapi.db.query(STAGE_MODEL_UID).create({
      data: { name: 'Stage 2' },
    });
    testWorkflow = await strapi.db.query(WORKFLOW_MODEL_UID).create({
      data: {
        contentTypes: [],
        name: 'workflow',
        stages: [defaultStage.id, secondStage.id],
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await testBuilder.cleanup();
  });

  /**
   * GET /review-workflows/homepage/recently-assigned-documents
   * - Used to display the list of recently assigned documents in a widget on the Homepage.
   */
  test('get the list of recently assigned documents', async () => {
    // Assign the article model to the review workflow
    await rq.put(`/review-workflows/workflows/${testWorkflow.id}?populate=*`, {
      body: { data: { contentTypes: [articleUid] } },
    });

    // Create an article
    const article = await strapi.documents(articleUid).create({
      data: {
        title: 'The mitochondria is the powerhouse of the cell',
      },
    });

    // Calling the endpoint before assigning the article to the user
    const responseBefore = await rq({
      method: 'GET',
      url: '/review-workflows/homepage/recently-assigned-documents',
    });
    // Should return an empty list
    expect(responseBefore.statusCode).toBe(200);
    expect(responseBefore.body.data).toHaveLength(0);

    // Assign the article to the current user
    const user = rq.getLoggedUser();
    await rq({
      method: 'PUT',
      url: `/review-workflows/content-manager/collection-types/${articleUid}/${article.documentId}/assignee`,
      body: {
        data: { id: user.id },
      },
    });

    // Calling the endpoint again
    const responseUpdated = await rq({
      method: 'GET',
      url: '/review-workflows/homepage/recently-assigned-documents',
    });

    // Should now return a list with the assigned article
    expect(responseUpdated.statusCode).toBe(200);
    expect(responseUpdated.body.data).toHaveLength(1);
    expect(responseUpdated.body.data[0].title).toBe(
      'The mitochondria is the powerhouse of the cell'
    );
  });
});

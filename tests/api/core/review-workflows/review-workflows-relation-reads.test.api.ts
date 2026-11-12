import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { describeOnCondition } from 'api-tests/utils';
import {
  STAGE_MODEL_UID,
  WORKFLOW_MODEL_UID,
  ENTITY_STAGE_ATTRIBUTE,
  ENTITY_ASSIGNEE_ATTRIBUTE,
} from '../../../../packages/core/review-workflows/server/src/constants/workflows';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const testBuilder = createTestBuilder();
let strapi;
let rq;

const noteUid = 'api::note.note';
const noteModel = {
  kind: 'collectionType',
  collectionName: 'notes',
  singularName: 'note',
  pluralName: 'notes',
  displayName: 'Note',
  draftAndPublish: true,
  pluginOptions: {},
  attributes: {
    title: { type: 'string' },
  },
};

/**
 * Records the shape of the stage and assignee relations that the review workflows controllers and
 * the assignees service read from a document, with the same document service calls they make.
 */
describeOnCondition(edition === 'EE')('Review Workflows relation reads', () => {
  let testWorkflow;

  beforeAll(async () => {
    await testBuilder.addContentTypes([noteModel]).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const firstStage = await strapi.db.query(STAGE_MODEL_UID).create({ data: { name: 'First' } });
    const secondStage = await strapi.db.query(STAGE_MODEL_UID).create({ data: { name: 'Second' } });
    testWorkflow = await strapi.db.query(WORKFLOW_MODEL_UID).create({
      data: { contentTypes: [], name: 'workflow', stages: [firstStage.id, secondStage.id] },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await testBuilder.cleanup();
  });

  // controllers/stages.ts updateEntity and listAvailableStages, controllers/assignees.ts updateEntity
  test('findOne with the stage populated reads the stage as null when unset and { id: number } when set', async () => {
    const note = await strapi.documents(noteUid).create({ data: { title: 'Unstaged' } });

    const unstaged = await strapi.documents(noteUid).findOne({
      documentId: note.documentId,
      locale: undefined,
      populate: [ENTITY_STAGE_ATTRIBUTE],
    });
    expect(unstaged[ENTITY_STAGE_ATTRIBUTE]).toBeNull();

    // Assigning the content type to a workflow moves its entries to the first stage
    const { status } = await rq.put(`/review-workflows/workflows/${testWorkflow.id}`, {
      body: { data: { contentTypes: [noteUid] } },
    });
    expect(status).toBe(200);

    const staged = await strapi.documents(noteUid).findOne({
      documentId: note.documentId,
      locale: undefined,
      populate: [ENTITY_STAGE_ATTRIBUTE],
    });
    expect(staged[ENTITY_STAGE_ATTRIBUTE]).toEqual(
      expect.objectContaining({ id: expect.any(Number) })
    );
  });

  // services/assignees.ts updateEntityAssignee
  test('update with the assignee populated reads the assignee as { id: number } when set and null when removed', async () => {
    const note = await strapi.documents(noteUid).create({ data: { title: 'Assigned' } });
    const user = rq.getLoggedUser();

    const assigned = await strapi.documents(noteUid).update({
      documentId: note.documentId,
      locale: undefined,
      data: { [ENTITY_ASSIGNEE_ATTRIBUTE]: user.id },
      populate: [ENTITY_ASSIGNEE_ATTRIBUTE],
      fields: [],
    });
    expect(assigned[ENTITY_ASSIGNEE_ATTRIBUTE]).toEqual(expect.objectContaining({ id: user.id }));
    expect(assigned[ENTITY_ASSIGNEE_ATTRIBUTE].id).toEqual(expect.any(Number));

    const removed = await strapi.documents(noteUid).update({
      documentId: note.documentId,
      locale: undefined,
      data: { [ENTITY_ASSIGNEE_ATTRIBUTE]: null },
      populate: [ENTITY_ASSIGNEE_ATTRIBUTE],
      fields: [],
    });
    expect(removed[ENTITY_ASSIGNEE_ATTRIBUTE]).toBeNull();
  });
});

/**
 * Pins the runtime shape of the review workflows service results that `strapi.db.query` infers as
 * `any`, against their contracts in `packages/core/review-workflows/server/src/types/services.ts`.
 * A later typing of these call sites relies on what these tests record.
 */
import { createStrapiInstance } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition, createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

import {
  ENTITY_ASSIGNEE_ATTRIBUTE,
  STAGE_MODEL_UID,
  STAGE_TRANSITION_UID,
  WORKFLOW_MODEL_UID,
} from '../../../../packages/core/review-workflows/server/src/constants/workflows';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const productUID = 'api::product.product';
const model = {
  draftAndPublish: true,
  singularName: 'product',
  pluralName: 'products',
  displayName: 'Product',
  kind: 'collectionType',
  attributes: {
    name: { type: 'string' },
  },
};

const MISSING_ID = 999999;

/** `StageRow` */
const stageRow = () => ({
  id: expect.any(Number),
  documentId: expect.any(String),
  name: expect.any(String),
  color: expect.any(String),
  locale: null,
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  publishedAt: expect.any(String),
});

/** `WorkflowRow` without its relations */
const workflowRow = () => ({
  id: expect.any(Number),
  documentId: expect.any(String),
  name: expect.any(String),
  contentTypes: [productUID],
  locale: null,
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  publishedAt: expect.any(String),
});

/** `StagePermissionRow` as `WORKFLOW_POPULATE` selects it: `WorkflowStagePermission` */
const workflowStagePermission = () => ({
  id: expect.any(Number),
  documentId: expect.any(String),
  action: STAGE_TRANSITION_UID,
  actionParameters: expect.any(Object),
  role: { id: expect.any(Number), documentId: expect.any(String), name: expect.any(String) },
});

/** `StoredWorkflow`: stages with their permissions, and the stage required to publish */
const storedWorkflow = (stageRequiredToPublish: unknown, permissionCounts: number[]) => ({
  ...workflowRow(),
  stages: permissionCounts.map((count) => ({
    ...stageRow(),
    permissions: Array.from({ length: count }, workflowStagePermission),
  })),
  stageRequiredToPublish,
});

describeOnCondition(edition === 'EE')('Review workflows service results (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let utils: ReturnType<typeof createUtils>;
  let userId: number;
  let roleId: number;
  const workflowIds: number[] = [];

  const service = (name: 'assignees' | 'stages' | 'workflows') =>
    strapi.plugin('review-workflows').service(name);

  /** The first stage can move entries in and out for `roleId`, the second is required to publish */
  const createWorkflow = async (name: string) => {
    const workflow = await service('workflows').create({
      data: {
        name,
        contentTypes: [productUID],
        stageRequiredToPublishName: 'Review',
        stages: [
          {
            name: 'Draft',
            fromPermissions: [{ role: roleId, action: STAGE_TRANSITION_UID }],
            toPermissions: [{ role: roleId, action: STAGE_TRANSITION_UID }],
          },
          { name: 'Review', color: '#4945FF' },
        ],
      },
    });
    workflowIds.push(workflow.id);
    return workflow;
  };

  beforeAll(async () => {
    await builder.addContentTypes([model]).build();
    strapi = await createStrapiInstance();

    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    roleId = superAdminRole.id;
    const user = await utils.createUser({
      email: 'review-service-results@test.com',
      firstname: 'Review',
      lastname: 'Results',
      password: 'Password123',
      roles: [roleId],
    });
    userId = user.id;
  });

  afterAll(async () => {
    const workflows = await strapi.db
      .query(WORKFLOW_MODEL_UID)
      .findMany({ where: { id: { $in: workflowIds } }, populate: ['stages'] });
    for (const workflow of workflows) {
      await strapi.db
        .query(STAGE_MODEL_UID)
        .deleteMany({ where: { id: { $in: workflow.stages.map((stage: any) => stage.id) } } });
      await strapi.db.query(WORKFLOW_MODEL_UID).delete({ where: { id: workflow.id } });
    }
    await strapi.db.query(productUID).deleteMany({});
    await utils.deleteUserById(userId);
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('assignees.findEntityAssigneeId', () => {
    test('resolves the assignee ID as a number', async () => {
      const entry = await strapi.db
        .query(productUID)
        .create({ data: { name: 'Assigned', [ENTITY_ASSIGNEE_ATTRIBUTE]: userId } });

      const result = await service('assignees').findEntityAssigneeId(entry.id, productUID);

      expect(result).toBe(userId);
      expect(typeof result).toBe('number');
    });

    test('resolves null for an entry without assignee', async () => {
      const entry = await strapi.db.query(productUID).create({ data: { name: 'Unassigned' } });

      expect(await service('assignees').findEntityAssigneeId(entry.id, productUID)).toBeNull();
    });

    test('resolves null for a missing entry', async () => {
      expect(await service('assignees').findEntityAssigneeId(MISSING_ID, productUID)).toBeNull();
    });
  });

  describe('stages', () => {
    let workflow: any;

    beforeAll(async () => {
      workflow = await createWorkflow('Stage reads');
    });

    test('find without populate resolves StageRow[]', async () => {
      const stages = await service('stages').find({ workflowId: workflow.id });

      expect(stages).toStrictEqual([stageRow(), stageRow()]);
    });

    test('find with populate ["workflow", "permissions"] adds both relations', async () => {
      const stages = await service('stages').find({
        workflowId: workflow.id,
        populate: ['workflow', 'permissions'],
      });

      const permission = {
        id: expect.any(Number),
        documentId: expect.any(String),
        action: STAGE_TRANSITION_UID,
        actionParameters: expect.any(Object),
        subject: null,
        properties: {},
        conditions: [],
        locale: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        publishedAt: expect.any(String),
      };
      const populated = (permissionCount: number) => ({
        ...stageRow(),
        workflow: workflowRow(),
        permissions: Array.from({ length: permissionCount }, () => permission),
      });
      expect(stages).toStrictEqual([populated(2), populated(0)]);
    });

    test('find with a populated permission role matches StagePermissionRow["role"]', async () => {
      const [stage] = await service('stages').find({
        workflowId: workflow.id,
        populate: { permissions: { populate: ['role'] } },
      });

      expect(stage.permissions[0].role).toStrictEqual({
        id: roleId,
        documentId: expect.any(String),
        name: expect.any(String),
        code: 'strapi-super-admin',
        description: expect.any(String),
        locale: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        publishedAt: expect.any(String),
      });
    });

    // The contract accepts any `queryParams` populate, but the stage reads pass it to
    // `strapi.db.query` untransformed, which rejects a string.
    test('find and findById reject populate "*"', async () => {
      await expect(
        service('stages').find({ workflowId: workflow.id, populate: '*' })
      ).rejects.toThrow('Populate must be an object');
      await expect(
        service('stages').findById(workflow.stages[0].id, { populate: '*' })
      ).rejects.toThrow('Populate must be an object');
    });

    test('findById without populate resolves a StageRow', async () => {
      const stage = await service('stages').findById(workflow.stages[0].id, {
        workflowId: workflow.id,
      });

      expect(stage).toStrictEqual(stageRow());
    });

    test('findById resolves null for a missing stage', async () => {
      expect(await service('stages').findById(MISSING_ID)).toBeNull();
    });

    // The contract says that `workflowId` is ignored: the read filters on it.
    test('findById resolves null for a stage of another workflow', async () => {
      const other = await createWorkflow('Other stage reads');

      expect(
        await service('stages').findById(workflow.stages[0].id, { workflowId: other.id })
      ).toBeNull();
    });

    test('createMany resolves StageRow[] by default', async () => {
      const stages = await service('stages').createMany([
        { name: 'Plain' },
        { name: 'Guarded', fromPermissions: [{ role: roleId, action: STAGE_TRANSITION_UID }] },
      ]);

      expect(stages).toStrictEqual([stageRow(), stageRow()]);
      await service('stages').deleteMany(stages);
    });

    test('createMany resolves only the requested fields', async () => {
      const stages = await service('stages').createMany([{ name: 'Only id' }], {
        fields: ['id'],
      });

      expect(stages).toStrictEqual([{ id: expect.any(Number) }]);
      await service('stages').deleteMany(stages);
    });

    test('update resolves a StageRow, with or without permission changes', async () => {
      const [created] = await service('stages').createMany([{ name: 'To update' }]);
      const stored = await service('stages').findById(created.id, { populate: ['permissions'] });

      const renamed = await service('stages').update(stored, { id: created.id, name: 'Renamed' });
      expect(renamed).toStrictEqual({ ...stageRow(), id: created.id, name: 'Renamed' });

      const guarded = await service('stages').update(stored, {
        id: created.id,
        name: 'Guarded',
        toPermissions: [{ role: roleId, action: STAGE_TRANSITION_UID }],
      });
      expect(guarded).toStrictEqual({ ...stageRow(), id: created.id, name: 'Guarded' });

      await service('stages').delete(
        await service('stages').findById(created.id, { populate: ['permissions'] })
      );
    });

    test('update resolves null for a missing stage', async () => {
      expect(
        await service('stages').update(
          { id: MISSING_ID, name: 'x', color: 'x' },
          {
            id: MISSING_ID,
            name: 'Missing',
          }
        )
      ).toBeNull();
    });

    test('delete resolves the deleted StageRow', async () => {
      const [created] = await service('stages').createMany([
        { name: 'To delete', toPermissions: [{ role: roleId, action: STAGE_TRANSITION_UID }] },
      ]);
      const stored = await service('stages').findById(created.id, { populate: ['permissions'] });

      expect(await service('stages').delete(stored)).toStrictEqual({
        ...stageRow(),
        id: created.id,
        name: 'To delete',
      });
    });

    test('delete resolves null for a missing stage', async () => {
      expect(await service('stages').delete({ id: MISSING_ID })).toBeNull();
    });
  });

  describe('workflows', () => {
    let workflow: any;

    beforeAll(async () => {
      workflow = await createWorkflow('Workflow reads');
    });

    // Without populate, the reads use `WORKFLOW_POPULATE`
    test('find and findById without populate resolve a StoredWorkflow', async () => {
      const expected = storedWorkflow(stageRow(), [2, 0]);

      expect(await service('workflows').find({ filters: { id: workflow.id } })).toStrictEqual([
        expected,
      ]);
      expect(await service('workflows').findById(workflow.id)).toStrictEqual(expected);
    });

    test.each([['stages' as const], [{ stages: true }]])(
      'find and findById with populate %j add the stages without permissions',
      async (populate) => {
        const expected = { ...workflowRow(), stages: [stageRow(), stageRow()] };

        expect(
          await service('workflows').find({ filters: { id: workflow.id }, populate })
        ).toStrictEqual([expected]);
        expect(await service('workflows').findById(workflow.id, { populate })).toStrictEqual(
          expected
        );
      }
    );

    test('find and findById with populate ["stageRequiredToPublish"] add only that stage', async () => {
      const populate = ['stageRequiredToPublish'];
      const expected = { ...workflowRow(), stageRequiredToPublish: stageRow() };

      expect(
        await service('workflows').find({ filters: { id: workflow.id }, populate })
      ).toStrictEqual([expected]);
      expect(await service('workflows').findById(workflow.id, { populate })).toStrictEqual(
        expected
      );
    });

    // `localizations` is not a `WorkflowRow` key: populate "*" adds it although workflows are not
    // localized.
    test('find and findById with populate "*" add every relation, and localizations', async () => {
      const populate = '*';
      const expected = {
        ...workflowRow(),
        stages: [stageRow(), stageRow()],
        stageRequiredToPublish: stageRow(),
        createdBy: null,
        updatedBy: null,
        localizations: [],
      };

      expect(
        await service('workflows').find({ filters: { id: workflow.id }, populate })
      ).toStrictEqual([expected]);
      expect(await service('workflows').findById(workflow.id, { populate })).toStrictEqual(
        expected
      );
    });

    test('findById resolves null for a missing workflow', async () => {
      expect(await service('workflows').findById(MISSING_ID)).toBeNull();
    });

    test('create resolves a StoredWorkflow', async () => {
      const created = await createWorkflow('Created');

      expect(created).toStrictEqual({ ...storedWorkflow(stageRow(), [2, 0]), name: 'Created' });
    });

    test('create without a stage required to publish resolves it as null', async () => {
      const created = await service('workflows').create({
        data: { name: 'No required stage', contentTypes: [productUID], stages: [{ name: 'Only' }] },
      });
      workflowIds.push(created.id);

      expect(created).toStrictEqual({ ...storedWorkflow(null, [0]), name: 'No required stage' });
    });

    test('update resolves a StoredWorkflow', async () => {
      const created = await createWorkflow('To update');
      const stored = await service('workflows').findById(created.id);

      const updated = await service('workflows').update(stored, { data: { name: 'Updated' } });

      expect(updated).toStrictEqual({ ...storedWorkflow(stageRow(), [2, 0]), name: 'Updated' });
    });

    test('update clearing the stage required to publish resolves it as null', async () => {
      const created = await createWorkflow('To clear');
      const stored = await service('workflows').findById(created.id);

      const updated = await service('workflows').update(stored, {
        data: { stageRequiredToPublishName: null },
      });

      expect(updated).toStrictEqual({ ...storedWorkflow(null, [2, 0]), name: 'To clear' });
    });

    test('delete resolves the deleted WorkflowRow, without relations', async () => {
      const created = await createWorkflow('To delete');
      const stored = await service('workflows').findById(created.id, { populate: ['stages'] });

      expect(await service('workflows').delete(stored, {})).toStrictEqual({
        ...workflowRow(),
        id: created.id,
        name: 'To delete',
      });
    });

    test('delete resolves null for a missing workflow', async () => {
      expect(
        await service('workflows').delete(
          { id: MISSING_ID, name: 'Missing', contentTypes: [], stages: [] },
          {}
        )
      ).toBeNull();
    });
  });
});

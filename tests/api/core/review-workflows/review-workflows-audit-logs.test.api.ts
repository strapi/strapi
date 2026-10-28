import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition, createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

import {
  ENTITY_STAGE_ATTRIBUTE,
  STAGE_TRANSITION_UID,
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

const STAGE_COLOR = '#4945FF';

describeOnCondition(edition === 'EE')('Review workflows in audit logs (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;
  let actingAdminId: number;
  let roleIds: Record<'Super Admin' | 'Editor' | 'Author', number>;

  const actingAdmin = {
    email: 'review-audit-actor@test.com',
    firstname: 'Review',
    lastname: 'Actor',
    password: 'Password123',
  };

  const expectedActor = () => ({
    type: 'admin-user',
    user: { id: actingAdminId, email: actingAdmin.email, name: 'Review Actor' },
  });

  const findLogs = async (action: string) =>
    strapi.db.query('admin::audit-log').findMany({
      where: { action },
      populate: ['user'],
      orderBy: { id: 'asc' },
    });

  // Entry events are emitted without being awaited, so the row can land after the response.
  const waitForLogs = async (action: string, count: number) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const logs = await findLogs(action);
      if (logs.length >= count) {
        return logs;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    }
    return findLogs(action);
  };

  const expectExactlyOneLog = async (action: string) => {
    const logs = await waitForLogs(action, 1);
    expect(logs).toHaveLength(1);
    expect(logs[0].user.id).toBe(actingAdminId);
    return logs[0];
  };

  const expectNoLog = async (action: string) => {
    expect(await findLogs(action)).toHaveLength(0);
  };

  // Related users are recorded by id; the actor is the only user in the row.
  const expectNoUserData = (log: { payload: { details?: unknown; resource: unknown } }) => {
    const serialized = JSON.stringify({
      details: log.payload.details,
      resource: log.payload.resource,
    });
    expect(serialized).not.toMatch(/email|password|firstname|lastname/);
  };

  const clearAuditLogs = async () => {
    await strapi.db.query('admin::audit-log').deleteMany();
  };

  const permissions = (roles: number[]) =>
    roles.map((role) => ({ action: STAGE_TRANSITION_UID, role }));

  const post = async (url: string, body: Record<string, unknown>, status = 201) => {
    const res = await rq({ url, method: 'POST', body });
    expect(res.statusCode).toBe(status);
    return res.body.data;
  };

  const put = async (url: string, body: Record<string, unknown>) => {
    const res = await rq({ url, method: 'PUT', body });
    expect(res.statusCode).toBe(200);
    return res.body.data;
  };

  const del = async (url: string) => {
    const res = await rq({ url, method: 'DELETE' });
    expect(res.statusCode).toBe(200);
    return res.body.data;
  };

  const workflowsUrl = '/review-workflows/workflows?populate=*';
  const workflowUrl = (id: number) => `/review-workflows/workflows/${id}?populate=*`;
  const entryUrl = (documentId: string, action: 'stage' | 'assignee') =>
    `/review-workflows/content-manager/collection-types/${productUID}/${documentId}/${action}`;

  const createWorkflow = (name: string) =>
    post(workflowsUrl, {
      data: {
        name,
        contentTypes: [productUID],
        stageRequiredToPublishName: 'Review',
        stages: [
          {
            name: 'Draft',
            fromPermissions: permissions([roleIds.Editor, roleIds['Super Admin']]),
          },
          {
            name: 'Review',
            toPermissions: permissions([roleIds['Super Admin'], roleIds.Editor]),
          },
        ],
      },
    });

  const recordedStages = () => [
    {
      name: 'Draft',
      color: STAGE_COLOR,
      fromPermissions: ['Editor', 'Super Admin'],
      toPermissions: [],
    },
    {
      name: 'Review',
      color: STAGE_COLOR,
      fromPermissions: [],
      toPermissions: ['Editor', 'Super Admin'],
    },
  ];

  /** The created workflow, as the admin sends it back unchanged. */
  const sameValues = (workflow: any) => ({
    name: workflow.name,
    contentTypes: [productUID],
    stageRequiredToPublishName: 'Review',
    stages: workflow.stages.map((stage: any) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      fromPermissions: permissions(stage.fromPermissions.map((p: any) => p.role)),
      toPermissions: permissions(stage.toPermissions.map((p: any) => p.role)),
    })),
  });

  const deleteWorkflows = async () => {
    const workflows = await strapi.db.query('plugin::review-workflows.workflow').findMany({
      where: { name: { $in: ['Editorial', 'Marketing'] } },
      populate: ['stages'],
    });
    for (const workflow of workflows) {
      await strapi.plugin('review-workflows').service('workflows').delete(workflow, {});
    }
  };

  beforeAll(async () => {
    await builder.addContentTypes([model]).build();
    strapi = await createStrapiInstance();

    // Requests run as an admin of our own: with only the default super admin in the
    // database, asserting the actor would prove nothing.
    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    const actor = await utils.createUser({ ...actingAdmin, roles: [superAdminRole.id] });
    actingAdminId = actor.id;
    rq = await createAuthRequest({ strapi, userInfo: actingAdmin });

    const { body } = await rq({ url: '/admin/roles', method: 'GET' });
    roleIds = Object.fromEntries(body.data.map((role: any) => [role.name, role.id]));
  });

  afterAll(async () => {
    await deleteWorkflows();
    await clearAuditLogs();
    await utils.deleteUserById(actingAdminId);
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {
    await deleteWorkflows();
    await clearAuditLogs();
  });

  describe('workflows', () => {
    test('workflow.create', async () => {
      const workflow = await createWorkflow('Editorial');

      const log = await expectExactlyOneLog('workflow.create');
      expect(log.payload).toEqual({
        action: 'workflow.create',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'workflow', id: workflow.id, name: 'Editorial' },
        details: {
          contentTypes: [productUID],
          stages: recordedStages(),
          stageRequiredToPublish: 'Review',
        },
      });
      expectNoUserData(log);
    });

    // Bootstrap creates the default workflow the same way, with no request in context.
    test('a workflow created outside a request writes no row', async () => {
      await strapi
        .plugin('review-workflows')
        .service('workflows')
        .create({ data: { name: 'Editorial', contentTypes: [], stages: [{ name: 'Draft' }] } });

      await expectNoLog('workflow.create');
    });

    test('workflow.update with identical values writes no row', async () => {
      const workflow = await createWorkflow('Editorial');
      await clearAuditLogs();

      await put(workflowUrl(workflow.id), { data: sameValues(workflow) });

      await expectNoLog('workflow.update');
    });

    test('workflow.update records a rename and a cleared required stage', async () => {
      const workflow = await createWorkflow('Editorial');
      await clearAuditLogs();

      await put(workflowUrl(workflow.id), {
        data: { name: 'Marketing', stageRequiredToPublishName: null },
      });

      const log = await expectExactlyOneLog('workflow.update');
      expect(log.payload).toEqual({
        action: 'workflow.update',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'workflow', id: workflow.id, name: 'Marketing' },
        details: {
          changes: {
            name: { before: 'Editorial', after: 'Marketing' },
            stageRequiredToPublish: { before: 'Review', after: null },
          },
        },
      });
    });

    test('reordering stages records changes.stages only', async () => {
      const workflow = await createWorkflow('Editorial');
      await clearAuditLogs();

      const values = sameValues(workflow);
      await put(workflowUrl(workflow.id), {
        data: { ...values, stages: [values.stages[1], values.stages[0]] },
      });

      const log = await expectExactlyOneLog('workflow.update');
      const [draft, review] = recordedStages();
      expect(log.payload.details).toEqual({
        changes: { stages: { before: [draft, review], after: [review, draft] } },
      });
    });

    test('removing a role from toPermissions records changes.stages only', async () => {
      const workflow = await createWorkflow('Editorial');
      await clearAuditLogs();

      const values = sameValues(workflow);
      values.stages[1].toPermissions = permissions([roleIds['Super Admin']]);
      await put(workflowUrl(workflow.id), { data: values });

      const log = await expectExactlyOneLog('workflow.update');
      const [draft, review] = recordedStages();
      expect(log.payload.details).toEqual({
        changes: {
          stages: {
            before: [draft, review],
            after: [draft, { ...review, toPermissions: ['Super Admin'] }],
          },
        },
      });
    });

    test('workflow.update records content type changes as a set', async () => {
      const workflow = await createWorkflow('Editorial');
      await clearAuditLogs();

      await put(workflowUrl(workflow.id), { data: { contentTypes: [] } });

      const log = await expectExactlyOneLog('workflow.update');
      expect(log.payload.details).toEqual({
        changes: { contentTypes: { before: [productUID], after: [] } },
      });
    });

    test('a failed update writes no row', async () => {
      const workflow = await createWorkflow('Editorial');
      await clearAuditLogs();

      const res = await rq({
        url: workflowUrl(workflow.id),
        method: 'PUT',
        body: { data: { name: 'Marketing', stageRequiredToPublishName: 'Missing' } },
      });

      expect(res.statusCode).toBe(400);
      await expectNoLog('workflow.update');
    });

    test('moving a content type records both workflows', async () => {
      const source = await createWorkflow('Editorial');
      const target = await post(workflowsUrl, {
        data: { name: 'Marketing', stages: [{ name: 'Only' }] },
      });
      await clearAuditLogs();

      await put(workflowUrl(target.id), { data: { contentTypes: [productUID] } });

      const logs = await waitForLogs('workflow.update', 2);
      expect(logs).toHaveLength(2);
      expect(logs.map((log: any) => log.payload.resource)).toEqual([
        { type: 'workflow', id: target.id, name: 'Marketing' },
        { type: 'workflow', id: source.id, name: 'Editorial' },
      ]);
      expect(logs[0].payload.details).toEqual({
        changes: { contentTypes: { before: [], after: [productUID] } },
      });
      expect(logs[1].payload.details).toEqual({
        changes: { contentTypes: { before: [productUID], after: [] } },
      });
      expect(logs[1].user.id).toBe(actingAdminId);
    });

    test('workflow.delete', async () => {
      const workflow = await createWorkflow('Editorial');
      await clearAuditLogs();

      await del(workflowUrl(workflow.id));

      const log = await expectExactlyOneLog('workflow.delete');
      expect(log.payload).toEqual({
        action: 'workflow.delete',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'workflow', id: workflow.id, name: 'Editorial' },
      });
    });
  });

  describe('entries', () => {
    let workflow: any;
    let entry: any;

    beforeEach(async () => {
      workflow = await createWorkflow('Editorial');
      entry = await post(`/content-manager/collection-types/${productUID}`, { name: 'Phone' });
      await waitForLogs('entry.create', 1);
    });

    test('creating an entry writes no stage row and records the initial stage on entry.create', async () => {
      await expectNoLog('review-workflows.updateEntryStage');

      const [log] = await findLogs('entry.create');
      expect(log.payload.entry[ENTITY_STAGE_ATTRIBUTE]).toMatchObject({
        id: workflow.stages[0].id,
        name: 'Draft',
      });
    });

    test('review-workflows.updateEntryStage', async () => {
      await clearAuditLogs();

      await put(entryUrl(entry.documentId, 'stage'), { data: { id: workflow.stages[1].id } });

      const log = await expectExactlyOneLog('review-workflows.updateEntryStage');
      expect(log.payload).toEqual({
        action: 'review-workflows.updateEntryStage',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'entry', uid: productUID, id: entry.documentId },
        details: {
          locale: null,
          workflow: { id: workflow.id, name: 'Editorial' },
          changes: {
            stage: {
              before: { id: workflow.stages[0].id, name: 'Draft' },
              after: { id: workflow.stages[1].id, name: 'Review' },
            },
          },
        },
      });
      expectNoUserData(log);
    });

    test('entry.assignee.update records assignment and unassignment by user id', async () => {
      await clearAuditLogs();

      await put(entryUrl(entry.documentId, 'assignee'), { data: { id: actingAdminId } });

      const log = await expectExactlyOneLog('entry.assignee.update');
      expect(log.payload).toEqual({
        action: 'entry.assignee.update',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'entry', uid: productUID, id: entry.documentId },
        details: { locale: null, changes: { assignee: { before: null, after: actingAdminId } } },
      });
      expectNoUserData(log);

      await put(entryUrl(entry.documentId, 'assignee'), { data: { id: actingAdminId } });
      expect(await findLogs('entry.assignee.update')).toHaveLength(1);

      await put(entryUrl(entry.documentId, 'assignee'), { data: { id: null } });

      const logs = await waitForLogs('entry.assignee.update', 2);
      expect(logs).toHaveLength(2);
      expect(logs[1].payload.details).toEqual({
        locale: null,
        changes: { assignee: { before: actingAdminId, after: null } },
      });
    });
  });
});

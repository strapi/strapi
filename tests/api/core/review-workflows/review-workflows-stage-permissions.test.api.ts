import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition, createUtils } from 'api-tests/utils';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const productUID = 'api::product.product';
const model = {
  pluginOptions: {},
  singularName: 'product',
  pluralName: 'products',
  displayName: 'Product',
  kind: 'collectionType',
  draftAndPublish: true,
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const baseWorkflow = {
  contentTypes: [productUID],
  stages: [{ name: 'Stage 1' }, { name: 'Stage 2' }],
};

const getStageTransitionPermissions = (roleIds) => {
  return roleIds.map((roleId) => ({
    action: 'admin::review-workflows.stage.transition',
    role: roleId,
  }));
};

describeOnCondition(edition === 'EE')('Review workflows', () => {
  const builder = createTestBuilder();

  let strapi;
  let workflow;
  let rq;
  let roles;
  const createdWorkflowIds: number[] = [];

  const createWorkflow = async (data) => {
    const name = `workflow-${Math.random().toString(36)}`;
    const req = await rq.post('/review-workflows/workflows?populate=*', {
      body: { data: { name, ...data } },
    });

    const status = req.statusCode;
    const error = req.body.error;
    const workflow = req.body.data;

    if (workflow?.id) {
      createdWorkflowIds.push(workflow.id);
    }

    return { workflow, status, error };
  };

  const updateWorkflow = async (id, data) => {
    const req = await rq.put(`/review-workflows/workflows/${id}?populate=stages`, {
      body: { data },
    });

    const status = req.statusCode;
    const error = req.body.error;
    const workflow = req.body.data;

    return { workflow, status, error };
  };

  const deleteWorkflow = async (id) => {
    const req = await rq.delete(`/review-workflows/workflows/${id}`);

    const status = req.statusCode;
    const error = req.body.error;
    const workflow = req.body.data;

    return { workflow, status, error };
  };

  beforeAll(async () => {
    await builder.addContentTypes([model]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    workflow = await createWorkflow(baseWorkflow);

    // Get default roles
    const { body } = await rq.get('/admin/roles');
    roles = body.data;
  });

  afterAll(async () => {
    // Clean up all workflows created during tests
    for (const id of createdWorkflowIds) {
      await rq.delete(`/review-workflows/workflows/${id}`);
    }
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Assign workflow permissions', () => {
    // Create stage with permissions
    test('Can assign new stage permissions', async () => {
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          {
            ...baseWorkflow.stages[0],
            fromPermissions: getStageTransitionPermissions([roles[0].id, roles[1].id]),
          },
          baseWorkflow.stages[1],
        ],
      });

      expect(workflow.stages[0].fromPermissions).toHaveLength(2);
    });

    // Can unassign a role
    test('Can remove stage permissions', async () => {
      // Create workflow with permissions to transition to role 0 and 1
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          {
            ...baseWorkflow.stages[0],
            fromPermissions: getStageTransitionPermissions([roles[0].id, roles[1].id]),
          },
          baseWorkflow.stages[1],
        ],
      });

      // Update workflow to remove role 1
      const { workflow: updatedWorkflow } = await updateWorkflow(workflow.id, {
        stages: [
          {
            ...workflow.stages[0],
            fromPermissions: getStageTransitionPermissions([roles[0].id]),
          },
          workflow.stages[1],
        ],
      });

      // Validate that permissions have been removed from database
      const deletedPermission = await strapi.db.query('admin::permission').findOne({
        where: {
          id: workflow.stages[0].fromPermissions[1].id,
        },
      });

      expect(updatedWorkflow.stages[0].fromPermissions).toHaveLength(1);
      expect(deletedPermission).toBeNull();
    });

    test('Deleting stage removes permissions', async () => {
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          {
            ...baseWorkflow.stages[0],
            fromPermissions: getStageTransitionPermissions([roles[0].id, roles[1].id]),
          },
          baseWorkflow.stages[1],
        ],
      });

      const { workflow: updatedWorkflow } = await updateWorkflow(workflow.id, {
        ...workflow,
        stages: [workflow.stages[1]],
      });

      // Deleted stage permissions should be removed from database
      const permissions = await strapi.db.query('admin::permission').findMany({
        where: {
          id: { $in: workflow.stages[0].fromPermissions.map((p) => p.id) },
        },
      });

      expect(permissions).toHaveLength(0);
    });

    test('Deleting workflow removes permissions', async () => {
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          {
            ...baseWorkflow.stages[0],
            fromPermissions: getStageTransitionPermissions([roles[0].id, roles[1].id]),
          },
        ],
      });

      await deleteWorkflow(workflow.id);

      // Deleted workflow permissions should be removed from database
      const permissions = await strapi.db.query('admin::permission').findMany({
        where: {
          id: { $in: workflow.stages[0].fromPermissions.map((p) => p.id) },
        },
      });

      expect(permissions).toHaveLength(0);
    });

    test('Fails when using invalid action', async () => {
      const { status, error } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          {
            ...baseWorkflow.stages[0],
            fromPermissions: [{ action: 'invalid-action', role: roles[0].id }],
          },
        ],
      });

      expect(status).toBe(400);
      expect(error.name).toBe('ValidationError');
    });

    // TODO
    test.skip('Can send permissions as undefined to apply partial update', async () => {
      // Creates workflow with permissions
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          {
            ...baseWorkflow.stages[0],
            fromPermissions: [{ action: 'invalid-action', role: roles[0].id }],
          },
        ],
      });

      const { workflow: updatedWorkflow } = await updateWorkflow(workflow.id, {
        ...workflow,
        stages: [
          {
            ...workflow.stages[0],
            fromPermissions: undefined,
          },
        ],
      });

      // Permissions should be kept
      expect(updatedWorkflow.stages[0].fromPermissions).toHaveLength(1);
    });
  });

  describe('Assign "to" stage permissions', () => {
    test('Can assign new "to" permissions on stage creation', async () => {
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          baseWorkflow.stages[0],
          {
            ...baseWorkflow.stages[1],
            toPermissions: getStageTransitionPermissions([roles[0].id]),
          },
        ],
      });

      expect(workflow.stages[1].toPermissions).toHaveLength(1);
      expect(workflow.stages[1].toPermissions[0].role).toBe(roles[0].id);
    });

    test('Can assign both "from" and "to" permissions on the same stage', async () => {
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          {
            ...baseWorkflow.stages[0],
            fromPermissions: getStageTransitionPermissions([roles[0].id]),
            toPermissions: getStageTransitionPermissions([roles[1].id]),
          },
          baseWorkflow.stages[1],
        ],
      });

      expect(workflow.stages[0].fromPermissions).toHaveLength(1);
      expect(workflow.stages[0].toPermissions).toHaveLength(1);
      expect(workflow.stages[0].fromPermissions[0].role).toBe(roles[0].id);
      expect(workflow.stages[0].toPermissions[0].role).toBe(roles[1].id);
    });

    test('Can update "to" permissions', async () => {
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          baseWorkflow.stages[0],
          {
            ...baseWorkflow.stages[1],
            toPermissions: getStageTransitionPermissions([roles[0].id, roles[1].id]),
          },
        ],
      });

      expect(workflow.stages[1].toPermissions).toHaveLength(2);

      const { workflow: updatedWorkflow } = await updateWorkflow(workflow.id, {
        stages: [
          workflow.stages[0],
          {
            ...workflow.stages[1],
            toPermissions: getStageTransitionPermissions([roles[0].id]),
          },
        ],
      });

      expect(updatedWorkflow.stages[1].toPermissions).toHaveLength(1);
    });

    test('Deleting stage removes "to" permissions from database', async () => {
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          baseWorkflow.stages[0],
          {
            ...baseWorkflow.stages[1],
            toPermissions: getStageTransitionPermissions([roles[0].id]),
          },
        ],
      });

      const toPermissionIds = workflow.stages[1].toPermissions.map((p) => p.id);

      await updateWorkflow(workflow.id, {
        ...workflow,
        stages: [workflow.stages[0]],
      });

      const permissions = await strapi.db.query('admin::permission').findMany({
        where: { id: { $in: toPermissionIds } },
      });

      expect(permissions).toHaveLength(0);
    });

    test('Deleting workflow removes "to" permissions from database', async () => {
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          {
            ...baseWorkflow.stages[0],
            toPermissions: getStageTransitionPermissions([roles[0].id]),
          },
        ],
      });

      const toPermissionIds = workflow.stages[0].toPermissions.map((p) => p.id);

      await deleteWorkflow(workflow.id);

      const permissions = await strapi.db.query('admin::permission').findMany({
        where: { id: { $in: toPermissionIds } },
      });

      expect(permissions).toHaveLength(0);
    });

    test('Stages without "to" permissions have empty toPermissions array', async () => {
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [baseWorkflow.stages[0], baseWorkflow.stages[1]],
      });

      // No toPermissions set - stages should have empty toPermissions (no auto-population)
      expect(workflow.stages[0].toPermissions).toHaveLength(0);
      expect(workflow.stages[1].toPermissions).toHaveLength(0);
    });
  });

  describe('Enforce "to" stage permissions', () => {
    let utils;
    let allowedRole;
    let deniedRole;
    let allowedUser;
    let deniedUser;
    let allowedRequest;
    let deniedRequest;
    let enforcementWorkflow;
    let entry;

    const stagesEndpoint = (uid, documentId) =>
      `/review-workflows/content-manager/collection-types/${uid}/${documentId}/stages`;

    const stageTransitionEndpoint = (uid, documentId) =>
      `/review-workflows/content-manager/collection-types/${uid}/${documentId}/stage`;

    beforeAll(async () => {
      utils = createUtils(strapi);

      // Create two roles
      allowedRole = await utils.createRole({
        name: 'to-perm-allowed-role',
        description: 'Role allowed to transition to restricted stage',
      });
      deniedRole = await utils.createRole({
        name: 'to-perm-denied-role',
        description: 'Role denied from transitioning to restricted stage',
      });

      // Grant both roles content-manager read + stage transition "from" permissions
      const cmPermissions = [
        {
          action: 'plugin::content-manager.explorer.read',
          subject: productUID,
          fields: null,
          conditions: [],
        },
        {
          action: 'plugin::content-manager.explorer.update',
          subject: productUID,
          fields: null,
          conditions: [],
        },
      ];

      await utils.assignPermissionsToRole(allowedRole.id, cmPermissions);
      await utils.assignPermissionsToRole(deniedRole.id, cmPermissions);

      // Create users
      const allowedUserInfo = {
        email: 'allowed-to-perm@test.io',
        password: 'Testing123!',
        firstname: 'Allowed',
        lastname: 'User',
      };
      const deniedUserInfo = {
        email: 'denied-to-perm@test.io',
        password: 'Testing123!',
        firstname: 'Denied',
        lastname: 'User',
      };

      allowedUser = await utils.createUser({ ...allowedUserInfo, roles: [allowedRole.id] });
      deniedUser = await utils.createUser({ ...deniedUserInfo, roles: [deniedRole.id] });

      allowedRequest = await createAuthRequest({ strapi, userInfo: allowedUserInfo });
      deniedRequest = await createAuthRequest({ strapi, userInfo: deniedUserInfo });

      // Create workflow with both "from" and "to" permissions to isolate "to" enforcement
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          {
            name: 'Open',
            fromPermissions: getStageTransitionPermissions([allowedRole.id, deniedRole.id]),
            toPermissions: getStageTransitionPermissions([allowedRole.id, deniedRole.id]),
          },
          {
            name: 'Restricted',
            fromPermissions: getStageTransitionPermissions([allowedRole.id, deniedRole.id]),
            toPermissions: getStageTransitionPermissions([allowedRole.id]),
          },
        ],
      });

      enforcementWorkflow = workflow;

      // Create a product entry (it will be assigned to the first stage by default)
      const { body } = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${productUID}`,
        body: { name: 'Enforcement Test Product' },
      });

      entry = body.data;
    });

    afterAll(async () => {
      if (allowedUser) await utils.deleteUserById(allowedUser.id);
      if (deniedUser) await utils.deleteUserById(deniedUser.id);
      if (allowedRole) await utils.deleteRolesById([allowedRole.id]);
      if (deniedRole) await utils.deleteRolesById([deniedRole.id]);
      if (enforcementWorkflow) await deleteWorkflow(enforcementWorkflow.id);
    });

    test('GET .../stages excludes restricted stage for denied role', async () => {
      const res = await deniedRequest.get(stagesEndpoint(productUID, entry.documentId));

      // The denied user should not see the "Restricted" stage in available stages
      const stageNames = (res.body.data || []).map((s) => s.name);
      expect(stageNames).not.toContain('Restricted');
    });

    test('GET .../stages includes restricted stage for allowed role', async () => {
      const res = await allowedRequest.get(stagesEndpoint(productUID, entry.documentId));

      const stageNames = (res.body.data || []).map((s) => s.name);
      expect(stageNames).toContain('Restricted');
    });

    test('PUT .../stage returns 403 when denied role transitions to restricted stage', async () => {
      const restrictedStage = enforcementWorkflow.stages.find((s) => s.name === 'Restricted');

      const res = await deniedRequest({
        method: 'PUT',
        url: stageTransitionEndpoint(productUID, entry.documentId),
        body: { data: { id: restrictedStage.id } },
      });

      expect(res.statusCode).toBe(403);
    });

    test('PUT .../stage succeeds when allowed role transitions to restricted stage', async () => {
      const restrictedStage = enforcementWorkflow.stages.find((s) => s.name === 'Restricted');

      const res = await allowedRequest({
        method: 'PUT',
        url: stageTransitionEndpoint(productUID, entry.documentId),
        body: { data: { id: restrictedStage.id } },
      });

      expect(res.statusCode).toBe(200);
    });
  });
});

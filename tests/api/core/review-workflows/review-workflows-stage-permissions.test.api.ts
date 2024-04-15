import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition } from 'api-tests/utils';

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
  options: {
    reviewWorkflows: true,
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

  const createWorkflow = async (data) => {
    const name = `workflow-${Math.random().toString(36)}`;
    const req = await rq.post('/review-workflows/workflows?populate=*', {
      body: { data: { name, ...data } },
    });

    const status = req.statusCode;
    const error = req.body.error;
    const workflow = req.body.data;

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
            permissions: getStageTransitionPermissions([roles[0].id, roles[1].id]),
          },
          baseWorkflow.stages[1],
        ],
      });

      expect(workflow.stages[0].permissions).toHaveLength(2);
    });

    // Can unassign a role
    test('Can remove stage permissions', async () => {
      // Create workflow with permissions to transition to role 0 and 1
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          {
            ...baseWorkflow.stages[0],
            permissions: getStageTransitionPermissions([roles[0].id, roles[1].id]),
          },
          baseWorkflow.stages[1],
        ],
      });

      // Update workflow to remove role 1
      const { workflow: updatedWorkflow } = await updateWorkflow(workflow.id, {
        stages: [
          {
            ...workflow.stages[0],
            permissions: getStageTransitionPermissions([roles[0].id]),
          },
          workflow.stages[1],
        ],
      });

      // Validate that permissions have been removed from database
      const deletedPermission = await strapi.db.query('admin::permission').findOne({
        where: {
          id: workflow.stages[0].permissions[1].id,
        },
      });

      expect(updatedWorkflow.stages[0].permissions).toHaveLength(1);
      expect(deletedPermission).toBeNull();
    });

    test('Deleting stage removes permissions', async () => {
      const { workflow } = await createWorkflow({
        ...baseWorkflow,
        stages: [
          {
            ...baseWorkflow.stages[0],
            permissions: getStageTransitionPermissions([roles[0].id, roles[1].id]),
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
          id: { $in: workflow.stages[0].permissions.map((p) => p.id) },
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
            permissions: getStageTransitionPermissions([roles[0].id, roles[1].id]),
          },
        ],
      });

      await deleteWorkflow(workflow.id);

      // Deleted workflow permissions should be removed from database
      const permissions = await strapi.db.query('admin::permission').findMany({
        where: {
          id: { $in: workflow.stages[0].permissions.map((p) => p.id) },
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
            permissions: [{ action: 'invalid-action', role: roles[0].id }],
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
            permissions: [{ action: 'invalid-action', role: roles[0].id }],
          },
        ],
      });

      const { workflow: updatedWorkflow } = await updateWorkflow(workflow.id, {
        ...workflow,
        stages: [
          {
            ...workflow.stages[0],
            permissions: undefined,
          },
        ],
      });

      // Permissions should be kept
      expect(updatedWorkflow.stages[0].permissions).toHaveLength(1);
    });
  });
});

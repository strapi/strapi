'use strict';

import { omit } from 'lodash/fp';
import { mapAsync } from '@strapi/utils';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition, createUtils } from 'api-tests/utils';

import {
  STAGE_MODEL_UID,
  WORKFLOW_MODEL_UID,
  ENTITY_STAGE_ATTRIBUTE,
  ENTITY_ASSIGNEE_ATTRIBUTE,
} from '../../../../../packages/core/admin/ee/server/src/constants/workflows';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const productUID = 'api::product.product';
const model = {
  draftAndPublish: false,
  pluginOptions: {},
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

  const requests = {
    public: null,
    admin: null,
  };
  let strapi;
  let hasRW;
  let defaultStage;
  let secondStage;
  let testWorkflow;
  let createdWorkflow;

  const createEntry = async (uid, data) => {
    const { body } = await requests.admin({
      method: 'POST',
      url: `/content-manager/collection-types/${uid}`,
      body: data,
    });
    return body;
  };

  const updateEntry = async (uid, id, data) => {
    const { body } = await requests.admin({
      method: 'PUT',
      url: `/content-manager/collection-types/${uid}/${id}`,
      body: data,
    });
    return body;
  };

  const findAll = async (uid) => {
    const { body } = await requests.admin({
      method: 'GET',
      url: `/content-manager/collection-types/${uid}`,
    });
    return body;
  };

  /**
   * Create a full access token to authenticate the content API with
   */
  const getFullAccessToken = async () => {
    const res = await requests.admin.post('/admin/api-tokens', {
      body: {
        lifespan: null,
        description: '',
        type: 'full-access',
        name: 'Full Access',
        permissions: null,
      },
    });

    return res.body.data.accessKey;
  };

  beforeAll(async () => {
    await builder.addContentTypes([model]).build();
    // eslint-disable-next-line node/no-extraneous-require
    hasRW = require('@strapi/strapi/dist/utils/ee').features.isEnabled('review-workflows');

    // @ts-expect-error - We don't have the type for this
    strapi = await createStrapiInstance({ bypassAuth: false });
    requests.admin = await createAuthRequest({ strapi });
    // @ts-expect-error - We don't have the type for this
    requests.public = createRequest({ strapi }).setToken(await getFullAccessToken());

    defaultStage = await strapi.query(STAGE_MODEL_UID).create({
      data: { name: 'Stage' },
    });
    secondStage = await strapi.query(STAGE_MODEL_UID).create({
      data: { name: 'Stage 2' },
    });
    testWorkflow = await strapi.query(WORKFLOW_MODEL_UID).create({
      data: {
        contentTypes: [],
        name: 'workflow',
        stages: [defaultStage.id, secondStage.id],
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {
    testWorkflow = await strapi.query(WORKFLOW_MODEL_UID).update({
      where: { id: testWorkflow.id },
      data: {
        uid: 'workflow',
        stages: { set: [defaultStage.id, secondStage.id] },
      },
    });
    defaultStage = await strapi.query(STAGE_MODEL_UID).update({
      where: { id: defaultStage.id },
      data: { name: 'Stage' },
    });
    secondStage = await strapi.query(STAGE_MODEL_UID).update({
      where: { id: secondStage.id },
      data: { name: 'Stage 2' },
    });
  });

  describe('Get workflows', () => {
    test("It shouldn't be available for public", async () => {
      const res = await requests.public.get('/admin/review-workflows/workflows');

      if (hasRW) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const res = await requests.admin.get('/admin/review-workflows/workflows');

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBeTruthy();
        // Why 2 workflows ? One added by the test, the other one should be the default workflow added in bootstrap
        expect(res.body.data).toHaveLength(2);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });
  });

  describe('Get one workflow', () => {
    test("It shouldn't be available for public", async () => {
      const res = await requests.public.get(`/admin/review-workflows/workflows/${testWorkflow.id}`);

      if (hasRW) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const res = await requests.admin.get(`/admin/review-workflows/workflows/${testWorkflow.id}`);

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Object);
        expect(res.body.data).toEqual(testWorkflow);
        expect(typeof res.body.meta.workflowCount).toBe('number');
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
  });

  describe('Create workflow', () => {
    test('It should create a workflow without stages', async () => {
      const res = await requests.admin.post('/admin/review-workflows/workflows', {
        body: {
          data: {
            name: 'testWorkflow',
            stages: [],
          },
        },
      });

      if (hasRW) {
        expect(res.status).toBe(400);
        expect(res.body.error.message).toBe('Can not create a workflow without stages');
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
    test('It should create a workflow with stages', async () => {
      const res = await requests.admin.post('/admin/review-workflows/workflows?populate=stages', {
        body: {
          data: {
            name: 'createdWorkflow',
            stages: [
              { name: 'Stage 1', color: '#343434' },
              { name: 'Stage 2', color: '#141414' },
            ],
          },
        },
      });

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
          name: 'createdWorkflow',
          stages: [
            { name: 'Stage 1', color: '#343434' },
            { name: 'Stage 2', color: '#141414' },
          ],
        });
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }

      createdWorkflow = res.body.data;
    });
  });

  describe('Update workflow', () => {
    test('It should update a workflow', async () => {
      const res = await requests.admin.put(
        `/admin/review-workflows/workflows/${createdWorkflow.id}`,
        { body: { data: { name: 'updatedWorkflow' } } }
      );

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ name: 'updatedWorkflow' });
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });

    test('It should update a workflow with stages', async () => {
      const res = await requests.admin.put(
        `/admin/review-workflows/workflows/${createdWorkflow.id}?populate=stages`,
        {
          body: {
            data: {
              name: 'updatedWorkflow',
              stages: [
                { id: createdWorkflow.stages[0].id, name: 'Stage 1_Updated' },
                { name: 'Stage 2' },
              ],
            },
          },
        }
      );

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
          name: 'updatedWorkflow',
          stages: [
            { id: createdWorkflow.stages[0].id, name: 'Stage 1_Updated' },
            { name: 'Stage 2' },
          ],
        });
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
  });

  describe('Delete workflow', () => {
    test('It should delete a workflow', async () => {
      const createdRes = await requests.admin.post('/admin/review-workflows/workflows', {
        body: { data: { name: 'testWorkflow', stages: [{ name: 'Stage 1' }] } },
      });

      const res = await requests.admin.delete(
        `/admin/review-workflows/workflows/${createdRes.body.data.id}`
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: 'testWorkflow' });
    });
    test("It shouldn't delete a workflow that does not exist", async () => {
      const res = await requests.admin.delete(`/admin/review-workflows/workflows/123456789`);

      expect(res.status).toBe(404);
      expect(res.body.data).toBeNull();
    });
  });

  describe('Get workflow stages', () => {
    test("It shouldn't be available for public", async () => {
      const res = await requests.public.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=stages`
      );

      if (hasRW) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const res = await requests.admin.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=stages`
      );

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Object);
        expect(res.body.data.stages).toBeInstanceOf(Array);
        expect(res.body.data.stages).toHaveLength(2);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });
  });

  describe('Get stages', () => {
    test("It shouldn't be available for public", async () => {
      const res = await requests.public.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages`
      );

      if (hasRW) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const res = await requests.admin.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages`
      );

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBeTruthy();
        expect(res.body.data).toHaveLength(2);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });
  });

  describe('Get stage by id', () => {
    test("It shouldn't be available for public", async () => {
      const res = await requests.public.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages/${secondStage.id}`
      );

      if (hasRW) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const res = await requests.admin.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}/stages/${secondStage.id}`
      );

      if (hasRW) {
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Object);
        expect(res.body.data).toEqual(secondStage);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });
  });

  describe('Replace stages of a workflow', () => {
    let stagesUpdateData;

    beforeEach(() => {
      stagesUpdateData = [
        defaultStage,
        { id: secondStage.id, name: 'new_name' },
        { name: 'new stage' },
      ];
    });

    test("It should assign a default color to stages if they don't have one", async () => {
      const workflowRes = await requests.admin.put(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`,
        {
          body: {
            data: {
              stages: [
                defaultStage,
                { id: secondStage.id, name: secondStage.name, color: '#000000' },
              ],
            },
          },
        }
      );

      expect(workflowRes.status).toBe(200);
      expect(workflowRes.body.data.stages[0].color).toBe('#4945FF');
      expect(workflowRes.body.data.stages[1].color).toBe('#000000');
    });
    test("It shouldn't be available for public", async () => {
      const workflowRes = await requests.public.get(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`
      );

      if (hasRW) {
        expect(workflowRes.status).toBe(401);
      } else {
        expect(workflowRes.status).toBe(404);
        expect(workflowRes.body.data).toBeUndefined();
      }
    });
    test('It should be available for every connected users (admin)', async () => {
      const workflowRes = await requests.admin.put(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`,
        { body: { data: { stages: stagesUpdateData } } }
      );

      if (hasRW) {
        expect(workflowRes.status).toBe(200);
        expect(workflowRes.body.data).toBeInstanceOf(Object);
        expect(workflowRes.body.data.stages).toBeInstanceOf(Array);
        expect(workflowRes.body.data.stages[0]).toMatchObject(
          omit(['updatedAt'], stagesUpdateData[0])
        );
        expect(workflowRes.body.data.stages[1]).toMatchObject(
          omit(['updatedAt'], stagesUpdateData[1])
        );
        expect(workflowRes.body.data.stages[2]).toMatchObject({
          id: expect.any(Number),
          ...omit(['updatedAt'], stagesUpdateData[2]),
        });
      } else {
        expect(workflowRes.status).toBe(404);
        expect(workflowRes.body.data).toBeUndefined();
      }
    });
    test('It should throw an error if trying to delete all stages in a workflow', async () => {
      const workflowRes = await requests.admin.put(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`,
        { body: { data: { stages: [] } } }
      );

      if (hasRW) {
        expect(workflowRes.status).toBe(400);
        expect(workflowRes.body.error).toBeDefined();
        expect(workflowRes.body.error.name).toEqual('ValidationError');
      } else {
        expect(workflowRes.status).toBe(404);
        expect(workflowRes.body.data).toBeUndefined();
      }
    });
    test('It should throw an error if trying to create stages with duplicated names', async () => {
      const stagesRes = await requests.admin.put(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`,
        {
          body: {
            data: {
              stages: [{ name: 'To Do' }, { name: 'To Do' }],
            },
          },
        }
      );

      if (hasRW) {
        expect(stagesRes.status).toBe(400);
        expect(stagesRes.body.error).toBeDefined();
        expect(stagesRes.body.error.name).toEqual('ValidationError');
        expect(stagesRes.body.error.message).toBeDefined();
      }
    });
    test('It should throw an error if trying to create more than 200 stages', async () => {
      const stagesRes = await requests.admin.put(
        `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`,
        { body: { data: { stages: Array(201).fill({ name: 'new stage' }) } } }
      );

      if (hasRW) {
        expect(stagesRes.status).toBe(400);
        expect(stagesRes.body.error).toBeDefined();
        expect(stagesRes.body.error.name).toEqual('ValidationError');
        expect(stagesRes.body.error.message).toBeDefined();
      }
    });
  });

  describe('Update assignee on an entity', () => {
    describe('Review Workflow is enabled', () => {
      beforeAll(async () => {
        // Assign Product to workflow so workflow is active on this CT
        await requests.admin.put(
          `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`,
          { body: { data: { contentTypes: [productUID] } } }
        );
      });

      test('Should update the assignee on an entity', async () => {
        const entry = await createEntry(productUID, { name: 'Product' });
        const user = requests.admin.getLoggedUser();

        const response = await requests.admin({
          method: 'PUT',
          url: `/admin/content-manager/collection-types/${productUID}/${entry.id}/assignee`,
          body: {
            data: { id: user.id },
          },
        });
        expect(response.status).toBe(200);
        const assignee = response.body.data[ENTITY_ASSIGNEE_ATTRIBUTE];
        expect(assignee.id).toEqual(user.id);
        expect(assignee).not.toHaveProperty('password');
      });

      test('Should throw an error if user does not exist', async () => {
        const entry = await createEntry(productUID, { name: 'Product' });

        const response = await requests.admin({
          method: 'PUT',
          url: `/admin/content-manager/collection-types/${productUID}/${entry.id}/assignee`,
          body: {
            data: { id: 1234 },
          },
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.name).toEqual('ApplicationError');
        expect(response.body.error.message).toEqual('Selected user does not exist');
      });

      test('Correctly sanitize private fields of assignees in the content API', async () => {
        const assigneeAttribute = 'strapi_assignee';

        const { status, body } = await requests.public.get(`/api/${model.pluralName}`, {
          qs: { populate: assigneeAttribute },
        });

        expect(status).toBe(200);
        expect(body.data.length).toBeGreaterThan(0);

        const privateUserFields = [
          'password',
          'email',
          'resetPasswordToken',
          'registrationToken',
          'isActive',
          'roles',
          'blocked',
        ];

        // Assert that every assignee returned is sanitized correctly
        body.data.forEach((item) => {
          expect(item.attributes).toHaveProperty(assigneeAttribute);
          privateUserFields.forEach((field) => {
            expect(item.attributes[assigneeAttribute]).not.toHaveProperty(field);
          });
        });
      });
    });

    describe('Review Workflow is disabled', () => {
      beforeAll(async () => {
        // Unassign Product to workflow so workflow is inactive on this CT
        await requests.admin.put(
          `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`,
          { body: { data: { contentTypes: [] } } }
        );
      });

      test('Should not update the entity', async () => {
        const entry = await createEntry(productUID, { name: 'Product' });
        const user = requests.admin.getLoggedUser();

        const response = await requests.admin({
          method: 'PUT',
          url: `/admin/content-manager/collection-types/${productUID}/${entry.id}/assignee`,
          body: {
            data: { id: user.id },
          },
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.name).toBe('ApplicationError');
      });
    });
  });

  describe('Update a stage on an entity', () => {
    describe('Review Workflow is enabled', () => {
      beforeAll(async () => {
        // Update workflow to assign content type
        await requests.admin.put(
          `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`,
          { body: { data: { contentTypes: [productUID] } } }
        );
      });

      test('Should update the accordingly on an entity', async () => {
        const entry = await createEntry(productUID, { name: 'Product' });

        const response = await requests.admin({
          method: 'PUT',
          url: `/admin/content-manager/collection-types/${productUID}/${entry.id}/stage`,
          body: {
            data: { id: secondStage.id },
          },
        });

        expect(response.status).toBe(200);
        expect(response.body.data[ENTITY_STAGE_ATTRIBUTE]).toEqual(
          expect.objectContaining({ id: secondStage.id })
        );
      });
      test('Should throw an error if stage does not belong to the workflow', async () => {
        const entry = await createEntry(productUID, { name: 'Product' });

        const response = await requests.admin({
          method: 'PUT',
          url: `/admin/content-manager/collection-types/${productUID}/${entry.id}/stage`,
          body: {
            data: { id: 1234 },
          },
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.name).toEqual('ApplicationError');
        expect(response.body.error.message).toEqual('Stage does not belong to workflow "workflow"');
      });

      test('Should return entity stage information to the content API', async () => {
        const stageAttribute = 'strapi_stage';

        const { status, body } = await requests.public.get(`/api/${model.pluralName}`, {
          qs: { populate: stageAttribute },
        });

        expect(status).toBe(200);
        expect(body.data.length).toBeGreaterThan(0);

        body.data.forEach((item) => {
          expect(item.attributes).toHaveProperty(stageAttribute);
          expect(item.attributes[stageAttribute]).not.toBeNull();
          expect(item.attributes[stageAttribute].data.attributes).toHaveProperty('name');
        });
      });
    });

    describe('Review Workflow is disabled', () => {
      beforeAll(async () => {
        // Update workflow to unassign content type
        await requests.admin.put(
          `/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`,
          { body: { data: { contentTypes: [] } } }
        );
      });
      test('Should not update the entity', async () => {
        const entry = await createEntry(productUID, { name: 'Product' });

        const response = await requests.admin({
          method: 'PUT',
          url: `/admin/content-manager/collection-types/${productUID}/${entry.id}/stage`,
          body: {
            data: { id: secondStage.id },
          },
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.name).toBe('ApplicationError');
      });
    });
  });

  describe('Listing available stages for transition', () => {
    const endpoint = (id) => `/admin/content-manager/collection-types/${productUID}/${id}/stages`;

    let utils;
    let entry;
    let restrictedRequest;
    let restrictedUser;
    let restrictedRole;

    const deleteFixtures = async () => {
      await utils.deleteUserById(restrictedUser.id);
      await utils.deleteRolesById([restrictedRole.id]);
    };

    beforeAll(async () => {
      // Update workflow to assign content type
      await requests.admin.put(`/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`, {
        body: { data: { contentTypes: [productUID] } },
      });

      entry = await createEntry(productUID, { name: 'Product' });

      utils = createUtils(strapi);
      const role = await utils.createRole({
        name: 'restricted-role',
        description: '',
      });
      restrictedRole = role;

      const restrictedUserInfo = {
        email: 'restricted@user.io',
        password: 'Restricted123',
      };

      restrictedUser = await utils.createUserIfNotExists({
        ...restrictedUserInfo,
        roles: [role.id],
      });

      // @ts-expect-error - We don't have the type for this
      restrictedRequest = await createAuthRequest({ strapi, userInfo: restrictedUserInfo });
    });

    afterAll(async () => {
      await deleteFixtures();
    });

    test("It shouldn't be available for public", async () => {
      const res = await requests.public.get(endpoint(entry.id));

      if (hasRW) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(404);
        expect(res.body.data).toBeUndefined();
      }
    });

    test('It should return available stages for an admin user', async () => {
      const res = await requests.admin.get(endpoint(entry.id));

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject(secondStage);
    });

    test('It should be forbidden when the user cannot read the content type', async () => {
      const res = await restrictedRequest.get(endpoint(entry.id));

      expect(res.status).toBe(403);
    });

    test('It should return an empty list when a user does not have the permission to transition the current stage', async () => {
      const permission = {
        action: 'plugin::content-manager.explorer.read',
        subject: productUID,
        fields: null,
        conditions: [],
      };
      await utils.assignPermissionsToRole(restrictedRole.id, [permission]);

      const res = await restrictedRequest.get(endpoint(entry.id));

      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('Deleting a stage when content already exists', () => {
    beforeAll(async () => {
      // Update workflow to assign content type
      await requests.admin.put(`/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`, {
        body: { data: { contentTypes: [productUID] } },
      });
    });

    test('When content exists in a review stage and this stage is deleted, the content should be moved to the nearest available stage', async () => {
      const products = await findAll(productUID);

      // Move half of the entries to the last stage,
      // and the other half to the first stage
      await mapAsync(products.results, async (entity) =>
        updateEntry(productUID, entity.id, {
          [ENTITY_STAGE_ATTRIBUTE]: entity.id % 2 ? defaultStage.id : secondStage.id,
        })
      );

      // Delete last stage stage of the default workflow
      await requests.admin.put(`/admin/review-workflows/workflows/${testWorkflow.id}?populate=*`, {
        body: { data: { stages: [defaultStage] } },
      });

      // Expect the content in these stages to be moved to the nearest available stage
      const productsAfter = await findAll(productUID);
      for (const entry of productsAfter.results) {
        expect(entry[ENTITY_STAGE_ATTRIBUTE].name).toEqual(defaultStage.name);
      }
    });
  });
});

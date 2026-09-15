'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let publicRequest;
let publicRole;
let originalPermissions;

const groupModel = {
  attributes: {
    name: {
      type: 'string',
    },
    members: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::operation-limit-member.operation-limit-member',
      targetAttribute: 'groups',
    },
  },
  displayName: 'Operation Limit Group',
  singularName: 'operation-limit-group',
  pluralName: 'operation-limit-groups',
  description: '',
  collectionName: '',
  options: {
    draftAndPublish: false,
  },
};

const memberModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  displayName: 'Operation Limit Member',
  singularName: 'operation-limit-member',
  pluralName: 'operation-limit-members',
  description: '',
  collectionName: '',
  options: {
    draftAndPublish: false,
  },
};

const groupFindAction = 'api::operation-limit-group.operation-limit-group.find';
const memberFindAction = 'api::operation-limit-member.operation-limit-member.find';

const shallowQuery = /* GraphQL */ `
  query ShallowOperationLimitGroups {
    operationLimitGroups(pagination: { pageSize: 2 }) {
      documentId
      name
    }
  }
`;

const nestedQuery = /* GraphQL */ `
  query BoundedNestedOperationLimitGroups {
    operationLimitGroups(pagination: { pageSize: 2 }) {
      documentId
      name
      members(pagination: { pageSize: 2 }) {
        documentId
        name
        groups(pagination: { pageSize: 2 }) {
          documentId
          name
        }
      }
    }
  }
`;

const clone = (value) => JSON.parse(JSON.stringify(value));

const setEnabledActions = async (actions) => {
  const roleService = strapi.service('plugin::users-permissions.role');
  const roleDetails = await roleService.findOne(publicRole.id);
  const permissions = clone(roleDetails.permissions);

  for (const action of actions) {
    const [type, controller, name] = action.split('.');
    permissions[type] = permissions[type] || { controllers: {} };
    permissions[type].controllers = permissions[type].controllers || {};
    permissions[type].controllers[controller] = permissions[type].controllers[controller] || {};
    permissions[type].controllers[controller][name] = { enabled: true, policy: '' };
  }

  await roleService.updateRole(publicRole.id, { permissions });
};

const executeAnonymousQuery = (query) =>
  publicRequest({
    url: '/graphql',
    method: 'POST',
    body: { query },
  });

describe('GraphQL nested-relation public permission reachability', () => {
  beforeAll(async () => {
    await builder.addContentTypes([memberModel, groupModel]).build();

    strapi = await createStrapiInstance({
      bypassAuth: false,
      async bootstrap({ strapi: instance }) {
        // The API runner defaults this legacy mode to true; the reproduction must use v5 syntax.
        instance.config.set('plugin::graphql.v4CompatibilityMode', false);
      },
    });
    publicRequest = createRequest({ strapi });

    expect(strapi.plugin('graphql').config('v4CompatibilityMode')).toBe(false);

    const memberDocuments = await Promise.all(
      ['Member 1', 'Member 2'].map((name) =>
        strapi.documents('api::operation-limit-member.operation-limit-member').create({
          data: { name },
        })
      )
    );

    await Promise.all(
      ['Group 1', 'Group 2'].map((name) =>
        strapi.documents('api::operation-limit-group.operation-limit-group').create({
          data: {
            name,
            members: {
              connect: memberDocuments.map(({ documentId }) => ({ documentId })),
            },
          },
        })
      )
    );

    publicRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });
    const roleDetails = await strapi
      .service('plugin::users-permissions.role')
      .findOne(publicRole.id);
    originalPermissions = clone(roleDetails.permissions);
  });

  afterAll(async () => {
    if (strapi && publicRole && originalPermissions) {
      await strapi
        .service('plugin::users-permissions.role')
        .updateRole(publicRole.id, { permissions: originalPermissions });
    }
    if (strapi) {
      await strapi.destroy();
    }
    await builder.cleanup();
  });

  test('requires a public root find scope before the operation is reachable', async () => {
    const response = await executeAnonymousQuery(shallowQuery);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      data: null,
      errors: [{ message: 'Forbidden access' }],
    });
  });

  test('requires a public find scope for each nested relation target', async () => {
    await setEnabledActions([groupFindAction]);
    const response = await executeAnonymousQuery(nestedQuery);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual({ operationLimitGroups: [null, null] });
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Forbidden access',
          path: ['operationLimitGroups', 0, 'members'],
        }),
      ])
    );
  });

  test('allows bounded direct-v5 nested selections when every public find scope is granted', async () => {
    await setEnabledActions([groupFindAction, memberFindAction]);

    const shallow = await executeAnonymousQuery(shallowQuery);
    const nested = await executeAnonymousQuery(nestedQuery);

    expect(shallow.statusCode).toBe(200);
    expect(shallow.body.errors).toBeUndefined();
    expect(shallow.body.data.operationLimitGroups).toHaveLength(2);

    expect(nested.statusCode).toBe(200);
    expect(nested.body.errors).toBeUndefined();
    expect(nested.body.data.operationLimitGroups).toHaveLength(2);
    expect(nested.body.data.operationLimitGroups[0].members).toHaveLength(2);
    expect(nested.body.data.operationLimitGroups[0].members[0].groups).toHaveLength(2);
  });
});

'use strict';

const { performance } = require('node:perf_hooks');

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

const measureAnonymousQuery = async (query) => {
  let queryCount = 0;
  const onQuery = () => {
    queryCount += 1;
  };
  const startHeapUsed = process.memoryUsage().heapUsed;
  const start = performance.now();

  strapi.db.connection.on('query', onQuery);
  try {
    const response = await publicRequest({
      url: '/graphql',
      method: 'POST',
      body: { query },
    });
    const elapsedMs = performance.now() - start;
    const heapUsedDelta = process.memoryUsage().heapUsed - startHeapUsed;

    return {
      response,
      metrics: {
        queryCount,
        responseBytes: Buffer.byteLength(JSON.stringify(response.body)),
        elapsedMs,
        heapUsedDelta,
      },
    };
  } finally {
    strapi.db.connection.removeListener('query', onQuery);
  }
};

describe('GraphQL operation-limit reachability', () => {
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
    const { response } = await measureAnonymousQuery(shallowQuery);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      data: null,
      errors: [{ message: 'Forbidden access' }],
    });
  });

  test('requires a public find scope for each nested relation target', async () => {
    await setEnabledActions([groupFindAction]);
    const { response } = await measureAnonymousQuery(nestedQuery);

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

    const shallow = await measureAnonymousQuery(shallowQuery);
    const nested = await measureAnonymousQuery(nestedQuery);

    expect(shallow.response.statusCode).toBe(200);
    expect(shallow.response.body.errors).toBeUndefined();
    expect(shallow.response.body.data.operationLimitGroups).toHaveLength(2);
    expect(shallow.metrics).toEqual({
      queryCount: expect.any(Number),
      responseBytes: expect.any(Number),
      elapsedMs: expect.any(Number),
      heapUsedDelta: expect.any(Number),
    });

    expect(nested.response.statusCode).toBe(200);
    expect(nested.response.body.errors).toBeUndefined();
    expect(nested.response.body.data.operationLimitGroups).toHaveLength(2);
    expect(nested.response.body.data.operationLimitGroups[0].members).toHaveLength(2);
    expect(nested.response.body.data.operationLimitGroups[0].members[0].groups).toHaveLength(2);
    expect(nested.metrics).toEqual({
      queryCount: expect.any(Number),
      responseBytes: expect.any(Number),
      elapsedMs: expect.any(Number),
      heapUsedDelta: expect.any(Number),
    });

    // Diagnostic output is intentional: values are evidence, not performance thresholds.
    console.info('CMS-1206 bounded anonymous GraphQL metrics', {
      shallow: shallow.metrics,
      nested: nested.metrics,
    });
  });
});

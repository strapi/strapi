/**
 * Integration test for the content-type-builder schema management apis
 */

'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');

let strapi;
let rq;

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

const builder = createTestBuilder();

describe('Content Type Builder - Schema', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterEach(async () => {
    await restart();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('GET /content-type-builder/schema', () => {
    test('Get schema', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-type-builder/schema',
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('contentTypes');
      expect(res.body.data).toHaveProperty('components');

      // Check that the content types and components are maps of objects
      expect(res.body.data.contentTypes).toBeInstanceOf(Object);
      expect(res.body.data.components).toBeInstanceOf(Object);
    });
  });

  describe('POST /content-type-builder/update-schema', () => {
    describe('Test for invalid schema update', () => {
      test('Invalid action name on content type', async () => {
        const res = await rq({
          method: 'POST',
          url: '/content-type-builder/update-schema',
          body: {
            data: {
              contentTypes: [
                {
                  action: 'invalid-action',
                  uid: 'api::schema-test.schema-test',
                  displayName: 'Schema Test',
                  singularName: 'schema-test',
                  pluralName: 'schema-tests',
                  kind: 'collectionType',
                  attributes: [
                    {
                      name: 'title',
                      properties: {
                        type: 'string',
                      },
                    },
                  ],
                },
              ],
              components: [],
            },
          },
        });

        expect(res.statusCode).toBe(400);
      });

      test('Invalid action name on component', async () => {
        const res = await rq({
          method: 'POST',
          url: '/content-type-builder/update-schema',
          body: {
            data: {
              contentTypes: [],
              components: [
                {
                  action: 'invalid-action',
                  uid: 'basic.test-component',
                  displayName: 'Test Component',
                  category: 'basic',
                  attributes: [
                    {
                      name: 'name',
                      properties: {
                        type: 'string',
                      },
                    },
                  ],
                },
              ],
            },
          },
        });

        expect(res.statusCode).toBe(400);
      });

      test('Trying to create an existing content type', async () => {
        // First create the content type
        await rq({
          method: 'POST',
          url: '/content-type-builder/update-schema',
          body: {
            data: {
              contentTypes: [
                {
                  action: 'create',
                  uid: 'api::schema-test.schema-test',
                  displayName: 'Schema Test',
                  singularName: 'schema-test',
                  pluralName: 'schema-tests',
                  kind: 'collectionType',
                  attributes: [
                    {
                      name: 'title',
                      properties: {
                        type: 'string',
                      },
                    },
                  ],
                },
              ],
              components: [],
            },
          },
        });

        // Now try to create it again
        const res = await rq({
          method: 'POST',
          url: '/content-type-builder/update-schema',
          body: {
            data: {
              contentTypes: [
                {
                  action: 'create',
                  uid: 'api::schema-test.schema-test', // Same UID as before
                  displayName: 'Schema Test Duplicate',
                  singularName: 'schema-test-duplicate',
                  pluralName: 'schema-tests-duplicate',
                  kind: 'collectionType',
                  attributes: [
                    {
                      name: 'title',
                      properties: {
                        type: 'string',
                      },
                    },
                  ],
                },
              ],
              components: [],
            },
          },
        });

        expect(res.statusCode).toBe(400);
      });

      test('Trying to create an existing component', async () => {
        // First create the component
        await rq({
          method: 'POST',
          url: '/content-type-builder/update-schema',
          body: {
            data: {
              contentTypes: [],
              components: [
                {
                  action: 'create',
                  uid: 'basic.test-component',
                  displayName: 'Test Component',
                  category: 'basic',
                  attributes: [
                    {
                      name: 'name',
                      properties: {
                        type: 'string',
                      },
                    },
                  ],
                },
              ],
            },
          },
        });

        // Now try to create it again
        const res = await rq({
          method: 'POST',
          url: '/content-type-builder/update-schema',
          body: {
            data: {
              contentTypes: [],
              components: [
                {
                  action: 'create',
                  uid: 'basic.test-component', // Same UID as before
                  displayName: 'Test Component Duplicate',
                  category: 'basic',
                  attributes: [
                    {
                      name: 'name',
                      properties: {
                        type: 'string',
                      },
                    },
                  ],
                },
              ],
            },
          },
        });

        expect(res.statusCode).toBe(400);
      });
    });

    describe('Attribute validation', () => {
      test.todo('string');
      test.todo('text');
      test.todo('integer');
      test.todo('boolean');
      test.todo('float');
      test.todo('decimal');
      test.todo('biginteger');
      test.todo('time');
      test.todo('date');
      test.todo('datetime');
      test.todo('timestamp');
      test.todo('ui');
      test.todo('component');
      test.todo('dynamiczone');
      test.todo('relation');
      test.todo('media');
      test.todo('json');
      test.todo('enumeration');
      test.todo('password');
      test.todo('email');
      test.todo('uid');
      test.todo('richtext');
      test.todo('blocks');
      test.todo('customField');
    });

    test('Successful schema update with content type creation', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/update-schema',
        body: {
          data: {
            contentTypes: [
              {
                action: 'create',
                uid: 'api::schema-test.schema-test',
                displayName: 'Schema Test',
                singularName: 'schema-test',
                pluralName: 'schema-tests',
                kind: 'collectionType',
                draftAndPublish: false,
                attributes: [
                  {
                    action: 'create',
                    name: 'title',
                    properties: {
                      type: 'string',
                    },
                  },
                ],
              },
            ],
            components: [],
          },
        },
      });

      expect(res.statusCode).toBe(200);
    });

    test('Sending create action on existing attribute does not throw an error', async () => {
      // update a content-type
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/update-schema',
        body: {
          data: {
            contentTypes: [
              {
                action: 'update',
                uid: 'api::schema-test.schema-test',
                displayName: 'Schema Test',
                draftAndPublish: false,
                attributes: [
                  {
                    action: 'create',
                    name: 'title',
                    properties: {
                      type: 'string',
                    },
                  },
                ],
              },
            ],
            components: [],
          },
        },
      });

      expect(res.statusCode).toBe(200);
    });

    test('Sending delete action on non-existing attribute does not throw an error', async () => {
      // update a content-type
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/update-schema',
        body: {
          data: {
            contentTypes: [
              {
                action: 'update',
                uid: 'api::schema-test.schema-test',
                displayName: 'Schema Test',
                draftAndPublish: false,
                attributes: [
                  {
                    action: 'delete',
                    name: 'non-existing-attribute',
                    properties: {
                      type: 'string',
                    },
                  },
                ],
              },
            ],
            components: [],
          },
        },
      });

      expect(res.statusCode).toBe(200);
    });

    test('Schema update with component creation', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/update-schema',
        body: {
          data: {
            contentTypes: [],
            components: [
              {
                action: 'create',
                uid: 'basic.test-component',
                displayName: 'Test Component',
                category: 'basic',
                attributes: [
                  {
                    action: 'create',
                    name: 'name',
                    properties: {
                      type: 'string',
                    },
                  },
                ],
              },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(200);
    });

    test('Schema update with mixed operations', async () => {
      // Create a content type that we'll modify in this test
      await rq({
        method: 'POST',
        url: '/content-type-builder/update-schema',
        body: {
          data: {
            contentTypes: [
              {
                action: 'create',
                uid: 'api::schema-component-test.schema-component-test',
                displayName: 'Schema Component Test',
                singularName: 'schema-component-test',
                pluralName: 'schema-component-tests',
                kind: 'collectionType',
                draftAndPublish: false,
                attributes: [
                  {
                    action: 'create',
                    name: 'title',
                    properties: {
                      type: 'string',
                    },
                  },
                ],
              },
            ],
            components: [],
          },
        },
      });

      await restart();

      // Now update the content type, add a component, and modify some attributes
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/update-schema',
        body: {
          data: {
            contentTypes: [
              {
                action: 'update',
                uid: 'api::schema-component-test.schema-component-test',
                displayName: 'Schema Test',
                draftAndPublish: false,
                attributes: [
                  {
                    action: 'update',
                    name: 'title',
                    properties: {
                      type: 'string',
                      required: true,
                    },
                  },
                  {
                    action: 'create',
                    name: 'description',
                    properties: {
                      type: 'text',
                    },
                  },
                ],
              },
            ],
            components: [
              {
                action: 'update',
                uid: 'basic.test-component',
                category: 'basic',
                displayName: 'Test component',
                attributes: [
                  {
                    action: 'update',
                    name: 'name',
                    properties: {
                      type: 'string',
                    },
                  },
                  {
                    action: 'create',
                    name: 'count',
                    properties: {
                      type: 'integer',
                    },
                  },
                ],
              },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(200);
    });

    test('Schema update with attribute deletion', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/update-schema',
        body: {
          data: {
            contentTypes: [
              {
                action: 'update',
                uid: 'api::schema-component-test.schema-component-test',
                displayName: 'Schema Test',
                draftAndPublish: false,
                attributes: [
                  {
                    action: 'update',
                    name: 'title',
                    properties: {
                      type: 'string',
                      required: true,
                    },
                  },
                  {
                    action: 'delete',
                    name: 'description',
                    properties: {
                      type: 'text',
                    },
                  },
                ],
              },
            ],
            components: [],
          },
        },
      });

      expect(res.statusCode).toBe(200);
    });

    test('Schema update with content type deletion', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/update-schema',
        body: {
          data: {
            contentTypes: [
              {
                action: 'delete',
                uid: 'api::schema-test.schema-test',
              },
              {
                action: 'delete',
                uid: 'api::schema-component-test.schema-component-test',
              },
            ],
            components: [
              {
                action: 'delete',
                uid: 'basic.test-component',
              },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /content-type-builder/update-schema-status', () => {
    test('Get update schema status', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-type-builder/update-schema-status',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('isUpdating');
      expect(typeof res.body.data.isUpdating).toBe('boolean');
    });

    test('Cannot update schema while already updating', async () => {
      const reqBody = {
        method: 'POST',
        url: '/content-type-builder/update-schema',
        body: {
          data: {
            contentTypes: [
              {
                action: 'create',
                uid: 'api::blocked-update.blocked-update',
                displayName: 'Blocked Update',
                singularName: 'blocked-update',
                pluralName: 'blocked-updates',
                kind: 'collectionType',
                draftAndPublish: false,
                attributes: [
                  {
                    action: 'create',
                    name: 'title',
                    properties: {
                      type: 'string',
                    },
                  },
                ],
              },
            ],
            components: [],
          },
        },
      };

      // try to run them in // so it blocks on of the 2 requests
      const [resA, resB] = await Promise.all([rq(reqBody), rq(reqBody)]);

      // check the other request is not blocked
      expect(resA.statusCode).toBe(200);

      // check one of the requests is blocked
      expect(resB.statusCode).toBe(409);
      expect(resB.body).toMatchObject({
        error: {
          message: 'Schema update is already in progress.',
          name: 'ConflictError',
        },
      });

      await rq({
        method: 'POST',
        url: '/content-type-builder/update-schema',
        body: {
          data: {
            contentTypes: [
              {
                action: 'delete',
                uid: 'api::blocked-update.blocked-update',
              },
            ],
            components: [],
          },
        },
      });
    });
  });
});

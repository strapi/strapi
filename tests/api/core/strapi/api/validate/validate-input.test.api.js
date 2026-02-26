'use strict';

const { values } = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const resources = require('./resources');

const { fixtures, schemas } = resources;

const builder = createTestBuilder();

let strapi;
let rq;
let data;

const addSchemas = () => {
  for (const component of values(schemas.components)) {
    builder.addComponent(component);
  }

  builder.addContentTypes(values(schemas['content-types']));
};

const addFixtures = () => {
  const creationOrder = ['api::relation.relation', 'api::document.document'];

  creationOrder.forEach((uid) => {
    const fixture = fixtures['content-types'][uid];
    const schema = schemas['content-types'][uid];

    builder.addFixtures(schema.singularName, fixture);
  });
};

const init = async () => {
  addSchemas();
  addFixtures();

  await builder.build();

  strapi = await createStrapiInstance();

  data = await builder.sanitizedFixtures(strapi);

  rq = await createAuthRequest({ strapi });
};

const validDocInput = {
  name: 'string attr',
};

describe('Core API - Validate', () => {
  beforeAll(async () => {
    await init();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test.todo('validate input data type');
  test.todo('validate restricted relations');

  describe('Direct API - validate.input()', () => {
    let contentType;

    beforeEach(() => {
      contentType = strapi.contentType('api::document.document');
    });

    describe('Valid cases', () => {
      it('should accept valid input data', async () => {
        const input = {
          name: 'string attr',
          name_private: 'private name',
        };

        await expect(strapi.contentAPI.validate.input(input, contentType)).resolves.not.toThrow();
      });

      it('should accept relations', async () => {
        const input = {
          name: 'string attr',
          relations: [1],
        };

        await expect(strapi.contentAPI.validate.input(input, contentType)).resolves.not.toThrow();
      });

      it('should accept component data without id', async () => {
        const input = {
          name: 'string attr',
          componentA: {
            name: 'Component Name', // No id field - this should be allowed
          },
        };

        await expect(strapi.contentAPI.validate.input(input, contentType)).resolves.not.toThrow();
      });

      it('should accept nested component data without id', async () => {
        const input = {
          name: 'string attr',
          componentA: {
            name: 'Component Name',
            nestedComponent: {
              name: 'Nested Component Name', // No id field - this should be allowed
            },
          },
        };

        await expect(strapi.contentAPI.validate.input(input, contentType)).resolves.not.toThrow();
      });
    });

    describe('Invalid cases', () => {
      it('should throw error for unrecognized fields', async () => {
        const input = {
          name: 'string attr',
          unrecognizedField: 'should throw error',
        };

        await expect(strapi.contentAPI.validate.input(input, contentType)).rejects.toThrow();
      });

      it('should throw error for id field', async () => {
        const input = {
          name: 'string attr',
          id: 123,
        };

        await expect(strapi.contentAPI.validate.input(input, contentType)).rejects.toThrow();
      });

      it('should throw error for documentId field', async () => {
        const input = {
          name: 'string attr',
          documentId: 'some-doc-id',
        };

        await expect(strapi.contentAPI.validate.input(input, contentType)).rejects.toThrow();
      });

      it('should throw error for non-writable fields', async () => {
        const input = {
          name: 'string attr',
          name_non_writable: 'should throw error',
        };

        await expect(strapi.contentAPI.validate.input(input, contentType)).rejects.toThrow();
      });
    });

    describe('route.request.body (extra body params)', () => {
      const z = require('zod/v4');

      let contentType;

      beforeEach(() => {
        contentType = strapi.contentType('api::document.document');
      });

      it('allows extra body param from route at root and Zod parses', async () => {
        const route = {
          request: {
            body: {
              'application/json': z.object({
                name: z.string(),
                clientMutationId: z.string().optional(),
              }),
            },
          },
        };

        const input = { name: 'string attr', clientMutationId: 'abc' };

        await expect(
          strapi.contentAPI.validate.input(input, contentType, { route })
        ).resolves.not.toThrow();
      });

      it('throws when extra body param fails Zod validation', async () => {
        const route = {
          request: {
            body: {
              'application/json': z.object({
                name: z.string(),
                clientMutationIdFail: z.string(),
              }),
            },
          },
        };

        const input = { name: 'string attr', clientMutationIdFail: 123 };

        await expect(
          strapi.contentAPI.validate.input(input, contentType, { route })
        ).rejects.toThrow();
      });
    });

    describe('Direct API - validate.input() (continued)', () => {
      let contentType;

      beforeEach(() => {
        contentType = strapi.contentType('api::document.document');
      });

      it('should accept id in component data (used to reference existing component for update)', async () => {
        const input = {
          name: 'string attr',
          componentA: {
            id: 1,
            name: 'Component Name',
          },
        };

        await expect(strapi.contentAPI.validate.input(input, contentType)).resolves.not.toThrow();
      });

      it('should accept id in nested component data (used to reference existing nested component for update)', async () => {
        const input = {
          name: 'string attr',
          componentA: {
            name: 'Component Name',
            nestedComponent: {
              id: 1,
              name: 'Nested Component Name',
            },
          },
        };

        await expect(strapi.contentAPI.validate.input(input, contentType)).resolves.not.toThrow();
      });

      it('should accept documentId in component data (used to reference existing component for update)', async () => {
        const input = {
          name: 'string attr',
          componentA: {
            documentId: 'some-doc-id',
            name: 'Component Name',
          },
        };

        await expect(strapi.contentAPI.validate.input(input, contentType)).resolves.not.toThrow();
      });

      it('should accept documentId in nested component data (used to reference existing nested component for update)', async () => {
        const input = {
          name: 'string attr',
          componentA: {
            name: 'Component Name',
            nestedComponent: {
              documentId: 'some-doc-id',
              name: 'Nested Component Name',
            },
          },
        };

        await expect(strapi.contentAPI.validate.input(input, contentType)).resolves.not.toThrow();
      });
    });
  });

  describe.each([
    ['Create Input', 'post', () => '/api/documents'],
    ['Update Input', 'put', (doc) => `/api/documents/${doc.documentId}`],
  ])('%s', (description, method, urlFunc) => {
    let url;
    let createdDoc;

    beforeAll(async () => {
      // For update tests, ensure we have a document with a component to update
      if (method === 'put') {
        const createRes = await rq.post('/api/documents', {
          body: {
            data: {
              name: 'Test Document for Update',
              componentA: {
                name: 'Initial Component Name',
                nestedComponent: {
                  name: 'Initial Nested Component Name',
                },
              },
            },
          },
          qs: {
            populate: ['componentA.nestedComponent'],
          },
        });
        createdDoc = createRes.body.data;
        url = urlFunc(createdDoc);
      } else {
        url = urlFunc(data.document[0]);
      }
    });

    describe('Valid cases', () => {
      const validAttributes = [
        ['name_private', 'private name'],
        ['password', 'mypasswordstring1234'],
        ['relations', [1]],
        ['private_relations', [1]],
        ['name_hidden', 'some hidden field'],
        ['name_private', 'some private field'],
        ['name_non_searchable', 'some non searchable field'],
      ];

      test.each(validAttributes)('%s', async (attribute, value) => {
        const res = await rq[method](url, {
          body: {
            data: {
              ...validDocInput,
              [attribute]: value,
            },
          },
        });
        expect(res.status).toBe(method === 'post' ? 201 : 200);
      });

      it('should accept component data without id', async () => {
        const res = await rq[method](url, {
          body: {
            data: {
              ...validDocInput,
              componentA: {
                name: 'Component Name', // No id field - this should be allowed
              },
            },
          },
        });
        expect(res.status).toBe(method === 'post' ? 201 : 200);
      });

      it('should accept nested component data without id', async () => {
        const res = await rq[method](url, {
          body: {
            data: {
              ...validDocInput,
              componentA: {
                name: 'Component Name',
                nestedComponent: {
                  name: 'Nested Component Name', // No id field - this should be allowed
                },
              },
            },
          },
        });
        expect(res.status).toBe(method === 'post' ? 201 : 200);
      });

      it('should accept id in component data during CREATE (validation/sanitization allow it, Document Service strips it)', async () => {
        if (method === 'post') {
          const res = await rq[method](url, {
            body: {
              data: {
                ...validDocInput,
                componentA: {
                  id: 999,
                  name: 'Component Name With ID',
                },
              },
            },
            qs: {
              populate: ['componentA'],
            },
          });
          expect(res.status).toBe(201);
          expect(res.body.data.componentA).toBeDefined();
          expect(res.body.data.componentA.id).toBeDefined();
          expect(res.body.data.componentA.id).not.toBe(999);
          expect(res.body.data.componentA.name).toBe('Component Name With ID');
        }
      });

      it('should accept id in nested component data during CREATE (validation/sanitization allow it, Document Service strips it)', async () => {
        if (method === 'post') {
          const res = await rq[method](url, {
            body: {
              data: {
                ...validDocInput,
                componentA: {
                  name: 'Component Name',
                  nestedComponent: {
                    id: 888,
                    name: 'Nested Component Name With ID',
                  },
                },
              },
            },
            qs: {
              populate: ['componentA.nestedComponent'],
            },
          });
          expect(res.status).toBe(201);
          expect(res.body.data.componentA.nestedComponent).toBeDefined();
          expect(res.body.data.componentA.nestedComponent.id).toBeDefined();
          expect(res.body.data.componentA.nestedComponent.id).not.toBe(888);
          expect(res.body.data.componentA.nestedComponent.name).toBe(
            'Nested Component Name With ID'
          );
        }
      });
    });

    describe('400 Bad Request cases', () => {
      it('empty body', async () => {
        const res = await rq[method](url, { body: {} });
        expect(res.status).toBe(400);
        expect(res.error.message).toMatch(new RegExp(`Cannot ${method.toUpperCase()}`, 'i'));
        const err = JSON.parse(res.text).error;
        expect(err.message).toMatch(/Missing "data"/i);
      });

      const invalidAttributes = [
        ['id', 132456],
        ['documentId', 'somedocid'],
        ['name_non_writable', 'non-writable field'],
        ['createdAt', new Date().toISOString()],
        ['updatedAt', new Date().toISOString()],
        ['nonexistant_field', 'i do not exist on the schema'],
      ];

      test.each(invalidAttributes)('%s', async (attribute, value) => {
        const res = await rq[method](url, {
          body: {
            data: {
              ...validDocInput,
              [attribute]: value,
            },
          },
        });
        expect(res.status).toBe(400);
        expect(res.error.message).toMatch(new RegExp(`Cannot ${method.toUpperCase()}`, 'i'));
        const err = JSON.parse(res.text).error;
        expect(err.message).toMatch(new RegExp(`invalid key ${attribute}`, 'i'));
        expect(err.details.key).toMatch(attribute);
        expect(err.details.source).toMatch('body');
      });

      it('should accept id in component data during UPDATE (validation/sanitization allow it, Document Service uses it for targeted update)', async () => {
        if (method === 'put' && createdDoc?.componentA?.id) {
          const getRes = await rq.get(url, {
            qs: {
              populate: ['componentA'],
            },
          });
          expect(getRes.status).toBe(200);
          const componentId = getRes.body.data.componentA?.id;
          const originalName = getRes.body.data.componentA?.name;
          expect(componentId).toBeDefined();
          expect(originalName).toBeDefined();

          const res = await rq[method](url, {
            body: {
              data: {
                name: 'Updated Document Name',
                componentA: {
                  id: componentId,
                  name: 'Updated Component Name',
                },
              },
            },
            qs: {
              populate: ['componentA'],
            },
          });
          expect(res.status).toBe(200);
          expect(res.body.data.componentA.id).toBe(componentId);
          expect(res.body.data.componentA.name).toBe('Updated Component Name');
          expect(res.body.data.componentA.name).not.toBe(originalName);
        }
      });

      it('should accept id in nested component data during UPDATE', async () => {
        if (method === 'put' && createdDoc?.componentA?.nestedComponent?.id) {
          const getRes = await rq.get(url, {
            qs: {
              populate: ['componentA.nestedComponent'],
            },
          });
          expect(getRes.status).toBe(200);
          const componentId = getRes.body.data.componentA?.id;
          const nestedComponentId = getRes.body.data.componentA?.nestedComponent?.id;
          const originalNestedName = getRes.body.data.componentA?.nestedComponent?.name;
          expect(componentId).toBeDefined();
          expect(nestedComponentId).toBeDefined();
          expect(originalNestedName).toBeDefined();

          const res = await rq[method](url, {
            body: {
              data: {
                name: 'Updated Document Name 2',
                componentA: {
                  id: componentId,
                  name: 'Updated Component Name',
                  nestedComponent: {
                    id: nestedComponentId,
                    name: 'Updated Nested Component Name',
                  },
                },
              },
            },
            qs: {
              populate: ['componentA.nestedComponent'],
            },
          });
          expect(res.status).toBe(200);
          expect(res.body.data.componentA.nestedComponent.id).toBe(nestedComponentId);
          expect(res.body.data.componentA.nestedComponent.name).toBe(
            'Updated Nested Component Name'
          );
          expect(res.body.data.componentA.nestedComponent.name).not.toBe(originalNestedName);
        }
      });

      it('should accept documentId in component data', async () => {
        if (method === 'put') {
          const res = await rq[method](url, {
            body: {
              data: {
                ...validDocInput,
                componentA: {
                  documentId: 'some-doc-id', // Validation and sanitization allow this
                  name: 'Component Name',
                },
              },
            },
          });
          expect(res.status).toBe(200);
        }
      });

      it('should accept documentId in nested component data (validation/sanitization allow it)', async () => {
        if (method === 'put') {
          // documentId in nested component data is allowed by validation/sanitization
          // Note: Components may not have documentId fields, but validation should still allow it
          const res = await rq[method](url, {
            body: {
              data: {
                ...validDocInput,
                componentA: {
                  name: 'Component Name',
                  nestedComponent: {
                    documentId: 'some-doc-id', // Validation and sanitization allow this
                    name: 'Nested Component Name',
                  },
                },
              },
            },
          });
          expect(res.status).toBe(200);
        }
      });
    });
  });
});

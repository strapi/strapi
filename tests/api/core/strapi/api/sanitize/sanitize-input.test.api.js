'use strict';

const { values } = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const resources = require('../validate/resources');

const { fixtures, schemas } = resources;

describe('Core API - Sanitize Input', () => {
  const builder = createTestBuilder();
  let strapi;

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
  };

  beforeAll(async () => {
    await init();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('strictParams option', () => {
    let contentType;

    beforeEach(() => {
      contentType = strapi.contentType('api::document.document');
    });

    describe('Default behavior (strictParams: false)', () => {
      it('should keep unrecognized fields when option is not provided', async () => {
        const input = {
          name: 'string attr',
          unrecognizedField: 'should be kept',
          anotherUnrecognizedField: 123,
        };

        const sanitized = await strapi.contentAPI.sanitize.input(input, contentType);

        expect(sanitized).toHaveProperty('name');
        expect(sanitized).toHaveProperty('unrecognizedField');
        expect(sanitized).toHaveProperty('anotherUnrecognizedField');
        expect(sanitized.unrecognizedField).toBe('should be kept');
        expect(sanitized.anotherUnrecognizedField).toBe(123);
      });

      it('should keep unrecognized fields when option is explicitly false', async () => {
        const input = {
          name: 'string attr',
          unrecognizedField: 'should be kept',
        };

        const sanitized = await strapi.contentAPI.sanitize.input(input, contentType, {
          strictParams: false,
        });

        expect(sanitized).toHaveProperty('name');
        expect(sanitized).toHaveProperty('unrecognizedField');
        expect(sanitized.unrecognizedField).toBe('should be kept');
      });
    });

    describe('With strictParams: true', () => {
      it('should remove unrecognized fields at root level', async () => {
        const input = {
          name: 'string attr',
          unrecognizedField: 'should be removed',
        };

        const sanitized = await strapi.contentAPI.sanitize.input(input, contentType, {
          strictParams: true,
        });

        expect(sanitized).toHaveProperty('name');
        expect(sanitized).not.toHaveProperty('unrecognizedField');
        expect(sanitized.name).toBe('string attr');
      });

      it('should remove multiple unrecognized fields', async () => {
        const input = {
          name: 'string attr',
          unrecognizedField1: 'should be removed',
          unrecognizedField2: 'should also be removed',
          unrecognizedField3: 123,
        };

        const sanitized = await strapi.contentAPI.sanitize.input(input, contentType, {
          strictParams: true,
        });

        expect(sanitized).toHaveProperty('name');
        expect(sanitized).not.toHaveProperty('unrecognizedField1');
        expect(sanitized).not.toHaveProperty('unrecognizedField2');
        expect(sanitized).not.toHaveProperty('unrecognizedField3');
      });

      it('should keep recognized fields', async () => {
        const input = {
          name: 'string attr',
          name_private: 'private name',
        };

        const sanitized = await strapi.contentAPI.sanitize.input(input, contentType, {
          strictParams: true,
        });

        expect(sanitized).toHaveProperty('name');
        expect(sanitized).toHaveProperty('name_private');
        expect(sanitized.name).toBe('string attr');
        expect(sanitized.name_private).toBe('private name');
      });

      it('should still remove non-writable attributes', async () => {
        const input = {
          name: 'string attr',
          name_non_writable: 'should be removed',
          unrecognizedField: 'should also be removed',
        };

        const sanitized = await strapi.contentAPI.sanitize.input(input, contentType, {
          strictParams: true,
        });

        expect(sanitized).toHaveProperty('name');
        expect(sanitized).not.toHaveProperty('name_non_writable');
        expect(sanitized).not.toHaveProperty('unrecognizedField');
      });

      it('should still remove ID fields', async () => {
        const input = {
          name: 'string attr',
          id: 123,
          documentId: 'some-doc-id',
          unrecognizedField: 'should be removed',
        };

        const sanitized = await strapi.contentAPI.sanitize.input(input, contentType, {
          strictParams: true,
        });

        expect(sanitized).toHaveProperty('name');
        expect(sanitized).not.toHaveProperty('id');
        expect(sanitized).not.toHaveProperty('documentId');
        expect(sanitized).not.toHaveProperty('unrecognizedField');
      });

      it('should handle arrays of inputs', async () => {
        const input = [
          {
            name: 'first',
            unrecognizedField: 'should be removed',
          },
          {
            name: 'second',
            unrecognizedField: 'should also be removed',
          },
        ];

        const sanitized = await strapi.contentAPI.sanitize.input(input, contentType, {
          strictParams: true,
        });

        expect(Array.isArray(sanitized)).toBe(true);
        expect(sanitized).toHaveLength(2);
        expect(sanitized[0]).toHaveProperty('name');
        expect(sanitized[0]).not.toHaveProperty('unrecognizedField');
        expect(sanitized[1]).toHaveProperty('name');
        expect(sanitized[1]).not.toHaveProperty('unrecognizedField');
      });

      it('should handle nested unrecognized fields in relations', async () => {
        const input = {
          name: 'string attr',
          relations: [
            {
              id: 1,
              unrecognizedNestedField: 'should be removed',
            },
          ],
        };

        const sanitized = await strapi.contentAPI.sanitize.input(input, contentType, {
          strictParams: true,
        });

        expect(sanitized).toHaveProperty('name');
        expect(sanitized).toHaveProperty('relations');
        expect(Array.isArray(sanitized.relations)).toBe(true);
        expect(sanitized.relations[0]).toHaveProperty('id');
        expect(sanitized.relations[0]).not.toHaveProperty('unrecognizedNestedField');
      });

      it('should allow special relation reordering fields', async () => {
        const input = {
          name: 'string attr',
          relations: {
            connect: [{ id: 1 }],
            disconnect: [{ id: 2 }],
            unrecognizedField: 'should be removed',
          },
        };

        const sanitized = await strapi.contentAPI.sanitize.input(input, contentType, {
          strictParams: true,
        });

        expect(sanitized).toHaveProperty('name');
        expect(sanitized).toHaveProperty('relations');
        expect(sanitized.relations).toHaveProperty('connect');
        expect(sanitized.relations).toHaveProperty('disconnect');
        expect(sanitized.relations).not.toHaveProperty('unrecognizedField');
      });
    });

    describe('route.request.body (extra body params)', () => {
      const z = require('zod/v4');
      let contentType;

      beforeEach(() => {
        contentType = strapi.contentType('api::document.document');
      });

      it('keeps extra body param from route when strictParams: true and Zod parses', async () => {
        const route = {
          request: {
            body: {
              'application/json': z.object({
                name: z.string(),
                clientMutationId: z.string().transform((s) => s.trim()),
              }),
            },
          },
        };

        const input = { name: 'string attr', clientMutationId: '  bar  ' };
        const result = await strapi.contentAPI.sanitize.input(input, contentType, {
          strictParams: true,
          route,
        });

        expect(result).toHaveProperty('name', 'string attr');
        expect(result).toHaveProperty('clientMutationId', 'bar');
      });

      it('removes extra body param when Zod safeParse fails', async () => {
        const route = {
          request: {
            body: {
              'application/json': z.object({
                name: z.string(),
                clientMutationIdEmpty: z.string().min(1),
              }),
            },
          },
        };

        const input = { name: 'string attr', clientMutationIdEmpty: '' };
        const result = await strapi.contentAPI.sanitize.input(input, contentType, {
          strictParams: true,
          route,
        });

        expect(result).toHaveProperty('name', 'string attr');
        expect(result).not.toHaveProperty('clientMutationIdEmpty');
      });
    });

    describe('Query - top-level unrecognized fields', () => {
      describe('Default behavior (strictParams: false)', () => {
        it('should keep unrecognized top-level query params when option is not provided', async () => {
          const query = {
            filters: { name: { $eq: 'test' } },
            where: { updatedBy: { password: { $startsWith: 'x' } } },
            someUnknownKey: 'ignored',
          };

          const sanitized = await strapi.contentAPI.sanitize.query(query, contentType);

          expect(sanitized).toHaveProperty('filters');
          expect(sanitized).toHaveProperty('where');
          expect(sanitized).toHaveProperty('someUnknownKey');
          expect(sanitized.where).toEqual({ updatedBy: { password: { $startsWith: 'x' } } });
        });

        it('should keep unrecognized top-level query params when option is explicitly false', async () => {
          const query = {
            sort: { name: 'asc' },
            where: { createdBy: { id: 1 } },
          };

          const sanitized = await strapi.contentAPI.sanitize.query(query, contentType, {
            strictParams: false,
          });

          expect(sanitized).toHaveProperty('sort');
          expect(sanitized).toHaveProperty('where');
          expect(sanitized.where).toEqual({ createdBy: { id: 1 } });
        });
      });

      describe('With strictParams: true', () => {
        it('should remove unrecognized top-level query params', async () => {
          const query = {
            filters: { name: { $eq: 'test' } },
            where: { updatedBy: { password: { $startsWith: 'x' } } },
            someUnknownKey: 'ignored',
          };

          const sanitized = await strapi.contentAPI.sanitize.query(query, contentType, {
            strictParams: true,
          });

          expect(sanitized).toHaveProperty('filters');
          expect(sanitized).not.toHaveProperty('where');
          expect(sanitized).not.toHaveProperty('someUnknownKey');
        });

        it('should keep only allowed query param keys', async () => {
          const query = {
            sort: { name: 'asc' },
            fields: ['name'],
            filters: { name: { $eq: 'a' } },
            populate: ['relation'],
            page: 1,
            pageSize: 10,
            where: { id: 1 },
            unknownParam: 'strip',
          };

          const sanitized = await strapi.contentAPI.sanitize.query(query, contentType, {
            strictParams: true,
          });

          expect(sanitized).toHaveProperty('sort');
          expect(sanitized).toHaveProperty('fields');
          expect(sanitized).toHaveProperty('filters');
          expect(sanitized).toHaveProperty('populate');
          expect(sanitized).toHaveProperty('page');
          expect(sanitized).toHaveProperty('pageSize');
          expect(sanitized).not.toHaveProperty('where');
          expect(sanitized).not.toHaveProperty('unknownParam');
        });
      });
    });
  });
});

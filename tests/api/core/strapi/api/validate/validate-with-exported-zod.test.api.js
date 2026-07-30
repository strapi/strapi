'use strict';

/**
 * API tests: schemas built with the exported Zod v4 from @strapi/utils (z)
 * are used and validated/sanitized correctly throughout the content API pipeline.
 * Covers happy paths and error cases for extra query and body params.
 */
const { values } = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { z } = require('@strapi/utils');

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
  rq = await createAuthRequest({ strapi });
  data = await builder.sanitizedFixtures(strapi);
};

describe('Content API – schemas from exported @strapi/utils z (Zod v4)', () => {
  beforeAll(async () => {
    await init();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('addQueryParams / addInputParams accept schemas from @strapi/utils', () => {
    it('addQueryParams accepts schema built with exported z and applyExtraParamsToRoutes succeeds', () => {
      strapi.contentAPI.addQueryParams({
        exportedZodSearch: { schema: z.string().max(200).optional() },
      });

      const route = {
        path: '/api/documents',
        method: 'GET',
        info: { type: 'content-api' },
        request: { query: {} },
      };

      expect(() => strapi.contentAPI.applyExtraParamsToRoutes([route])).not.toThrow();
      expect(route.request?.query).toHaveProperty('exportedZodSearch');
    });

    it('addInputParams accepts schema built with exported z and applyExtraParamsToRoutes succeeds', () => {
      strapi.contentAPI.addInputParams({
        exportedZodClientId: { schema: z.string().max(100).optional() },
      });

      const route = {
        path: '/api/documents',
        method: 'POST',
        info: { type: 'content-api' },
        request: { body: { 'application/json': {} } },
      };

      expect(() => strapi.contentAPI.applyExtraParamsToRoutes([route])).not.toThrow();
      expect(route.request?.body?.['application/json']).toBeDefined();
    });
  });

  describe('validate.query with extra query params (exported z)', () => {
    let contentType;

    beforeEach(() => {
      contentType = strapi.contentType('api::document.document');
    });

    it('happy path: allows valid extra query param', async () => {
      const route = { request: { query: { search: z.string().max(500) } } };
      const query = { filters: { id: 1 }, search: 'valid-search' };

      await expect(
        strapi.contentAPI.validate.query(query, contentType, { strictParams: true, route })
      ).resolves.not.toThrow();
    });

    it('error case: throws when extra query param fails validation', async () => {
      const route = { request: { query: { searchFail: z.string() } } };
      const query = { filters: { id: 1 }, searchFail: 123 };

      await expect(
        strapi.contentAPI.validate.query(query, contentType, { strictParams: true, route })
      ).rejects.toThrow();
    });

    it('error case: throws when string schema gets number', async () => {
      const route = { request: { query: { tag: z.enum(['a', 'b']) } } };
      const query = { filters: { id: 1 }, tag: 'c' };

      await expect(
        strapi.contentAPI.validate.query(query, contentType, { strictParams: true, route })
      ).rejects.toThrow();
    });
  });

  describe('sanitize.query with extra query params (exported z)', () => {
    let contentType;

    beforeEach(() => {
      contentType = strapi.contentType('api::document.document');
    });

    it('happy path: sanitizes extra query param with transform', async () => {
      const route = {
        request: { query: { searchSanitize: z.string().transform((s) => s.trim()) } },
      };
      const query = { filters: { id: 1 }, searchSanitize: '  bar  ' };

      const result = await strapi.contentAPI.sanitize.query(query, contentType, {
        strictParams: true,
        route,
      });

      expect(result.searchSanitize).toBe('bar');
      expect(result.filters).toEqual({ id: 1 });
    });

    it('error case: removes extra param when safeParse fails', async () => {
      const route = {
        request: { query: { badNumber: z.number() } },
      };
      const query = { filters: { id: 1 }, badNumber: 'not-a-number' };

      const result = await strapi.contentAPI.sanitize.query(query, contentType, {
        strictParams: true,
        route,
      });

      expect(result).not.toHaveProperty('badNumber');
      expect(result.filters).toEqual({ id: 1 });
    });
  });

  describe('validate.input with extra body params (exported z)', () => {
    let contentType;

    beforeEach(() => {
      contentType = strapi.contentType('api::document.document');
    });

    it('happy path: allows valid extra body param', async () => {
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
      const input = { name: 'string attr', clientMutationId: 'abc-123' };

      await expect(
        strapi.contentAPI.validate.input(input, contentType, { strictParams: true, route })
      ).resolves.not.toThrow();
    });

    it('error case: throws when extra body param fails validation', async () => {
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
        strapi.contentAPI.validate.input(input, contentType, { strictParams: true, route })
      ).rejects.toThrow();
    });
  });

  describe('sanitize.input with extra body params (exported z)', () => {
    let contentType;

    beforeEach(() => {
      contentType = strapi.contentType('api::document.document');
    });

    it('happy path: keeps and transforms extra body param', async () => {
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

    it('error case: removes extra body param when safeParse fails', async () => {
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
});

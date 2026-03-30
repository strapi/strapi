'use strict';

const { values, zip, symmetricDifference } = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest, createContentAPIRequest } = require('api-tests/request');
const resources = require('./resources');

const { fixtures, schemas } = resources;

const builder = createTestBuilder();

let data;
let strapi;
let rq;
let publicRq;

const addSchemas = () => {
  for (const component of values(schemas.components)) {
    builder.addComponent(component);
  }

  builder.addContentTypes(values(schemas['content-types']));
};

const addFixtures = () => {
  const creationOrder = [
    'api::relation.relation',
    'api::document.document',
    'api::article.article',
  ];

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
  publicRq = createContentAPIRequest({ strapi }); // Unauthenticated public API

  data = await builder.sanitizedFixtures(strapi);
};

const fixturesLength = (uid) => data?.[uid]?.length ?? 0;

function checkAPIResultValidity(res) {
  const { status, body } = res;

  expect(status).toBe(200);
  expect(Array.isArray(body.data)).toBe(true);
}

function checkAPIResultLength(res, expectedLength) {
  const len = typeof expectedLength === 'function' ? expectedLength() : expectedLength;

  checkAPIResultValidity(res);

  expect(res.body.data).toHaveLength(len);
}

function checkAPIResultOrder(res, order) {
  checkAPIResultValidity(res);
  checkAPIResultLength(res, order.length);

  zip(res.body.data, order).forEach(([entity, idx]) => {
    expect(entity.id).toBe(idx);
  });
}

function checkAPIResultFields(res, fields) {
  checkAPIResultValidity(res);

  res.body.data
    .map((entity) => Object.keys(entity))
    .map(symmetricDifference(fields))
    .forEach((diff) => {
      expect(diff).toStrictEqual([]);
    });
}

function sortByID(collection, order) {
  if (order === 'asc') {
    return collection.sort((a, b) => (a.id > b.id ? 1 : -1));
  }

  if (order === 'desc') {
    return collection.sort((a, b) => (a.id > b.id ? -1 : 1));
  }

  throw new Error(`Invalid sort order provided. Expected "asc" or "desc" but got ${order}`);
}

describe('Core API - Validate', () => {
  const documentsLength = () => fixturesLength('document');

  beforeAll(async () => {
    await init();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('strictParams option', () => {
    it('throws when strictParams: true and query has unrecognized top-level key', async () => {
      const contentType = strapi.contentType('api::document.document');
      const queryWithUnrecognized = { filters: { id: 1 }, where: { id: 1 } };

      await expect(
        strapi.contentAPI.validate.query(queryWithUnrecognized, contentType, {
          strictParams: true,
        })
      ).rejects.toThrow();
    });

    it('does not throw for unrecognized top-level key when strictParams: false', async () => {
      const contentType = strapi.contentType('api::document.document');
      const queryWithUnrecognized = { filters: { id: 1 }, where: { id: 1 } };

      await expect(
        strapi.contentAPI.validate.query(queryWithUnrecognized, contentType, {
          strictParams: false,
        })
      ).resolves.not.toThrow();
    });

    it('does not throw when strictParams: true and query has only allowed keys', async () => {
      const contentType = strapi.contentType('api::document.document');
      const queryAllowed = { filters: { id: 1 }, sort: ['name'], page: 1, pageSize: 10 };

      await expect(
        strapi.contentAPI.validate.query(queryAllowed, contentType, {
          strictParams: true,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('route.request.query (extra query params)', () => {
    const z = require('zod/v4');

    it('allows extra query param from route when strictParams: true and Zod parses', async () => {
      const route = { request: { query: { search: z.string() } } };
      const contentType = strapi.contentType('api::document.document');
      const query = { filters: { id: 1 }, search: 'foo' };
      await expect(
        strapi.contentAPI.validate.query(query, contentType, { strictParams: true, route })
      ).resolves.not.toThrow();
    });

    it('throws when strictParams: true and extra param fails Zod validation', async () => {
      const route = { request: { query: { searchFail: z.string() } } };
      const contentType = strapi.contentType('api::document.document');
      const query = { filters: { id: 1 }, searchFail: 123 };
      await expect(
        strapi.contentAPI.validate.query(query, contentType, { strictParams: true, route })
      ).rejects.toThrow();
    });

    it('sanitizes extra query param from route when strictParams: true', async () => {
      const route = {
        request: { query: { searchSanitize: z.string().transform((s) => s.trim()) } },
      };
      const contentType = strapi.contentType('api::document.document');
      const query = { filters: { id: 1 }, searchSanitize: '  bar  ' };
      const result = await strapi.contentAPI.sanitize.query(query, contentType, {
        strictParams: true,
        route,
      });
      expect(result.searchSanitize).toBe('bar');
      expect(result.filters).toEqual({ id: 1 });
    });
  });

  describe('api.rest.strictParams config', () => {
    it('can be set and read at api.rest.strictParams', () => {
      strapi.config.set('api.rest.strictParams', true);
      expect(strapi.config.get('api.rest.strictParams')).toBe(true);
      strapi.config.set('api.rest.strictParams', undefined);
      expect(strapi.config.get('api.rest.strictParams')).toBeUndefined();
    });

    it('returns 400 when api.rest.strictParams is true and request has unrecognized top-level query param', async () => {
      // Integration: controller should pass api.rest.strictParams to validate.query; skip if config not visible at request time in test env
      strapi.config.set('api.rest.strictParams', true);

      const res = await rq.get('/api/documents', { qs: { where: { id: 1 } } });

      strapi.config.set('api.rest.strictParams', undefined);

      expect(res.status).toEqual(400);
    });
  });

  describe('contentAPI.addQueryParams and addInputParams (strictParams + real request)', () => {
    let bodyParamTestDocumentId;

    beforeAll(() => {
      strapi.contentAPI.addQueryParams({
        extraParam: {
          schema: (zInstance) => zInstance.string().max(200).optional(),
          matchRoute: (route) => route.method === 'GET' && route.path === '/documents',
        },
      });
      strapi.contentAPI.addInputParams({
        clientMutationId: {
          schema: (zInstance) => zInstance.string().max(100).optional(),
          matchRoute: (route) => route.method === 'POST' && route.path === '/documents',
        },
      });
    });

    afterEach(async () => {
      strapi.config.set('api.rest.strictParams', undefined);
      strapi.config.set('api.documents.strictParams', undefined);
      if (bodyParamTestDocumentId) {
        await strapi.documents('api::document.document').delete({
          documentId: bodyParamTestDocumentId,
          locale: '*',
        });
        bodyParamTestDocumentId = null;
      }
    });

    const applyExtraParamsToAllRouters = () => {
      for (const apiName of Object.keys(strapi.apis)) {
        const api = strapi.api(apiName);
        const routers = api.routes ?? {};
        for (const router of Object.values(routers)) {
          if (router.routes && Array.isArray(router.routes)) {
            strapi.contentAPI.applyExtraParamsToRoutes(router.routes);
          }
        }
      }
    };

    // Order matters: run "no apply" tests first, then apply once, then "after apply" tests.
    it('returns 400 when strictParams is true and custom query param was registered but applyExtraParamsToRoutes has not been run', async () => {
      strapi.config.set('api.rest.strictParams', true);
      strapi.config.set('api.documents.strictParams', true);

      const res = await rq.get('/api/documents', { qs: { extraParam: 'hello' } });

      expect(res.status).toEqual(400);
    });

    it('returns 400 when strictParams is true and custom body param was registered but applyExtraParamsToRoutes has not been run', async () => {
      strapi.config.set('api.rest.strictParams', true);

      const res = await rq.post('/api/documents', {
        body: {
          data: { name: 'Body param test', clientMutationId: 'abc-123' },
        },
      });

      expect(res.status).toEqual(400);
    });

    it('returns 200 when strictParams is true and request includes custom query param after applyExtraParamsToRoutes (as initRouting does)', async () => {
      applyExtraParamsToAllRouters();
      strapi.config.set('api.rest.strictParams', true);
      strapi.config.set('api.documents.strictParams', true);

      const res = await rq.get('/api/documents', { qs: { extraParam: 'hello' } });

      expect(res.status).toEqual(200);
      expect(res.body.data).toBeDefined();
    });

    it('returns 201 when strictParams is true and request body includes custom body param after applyExtraParamsToRoutes (as initRouting does)', async () => {
      strapi.config.set('api.rest.strictParams', true);

      const res = await rq.post('/api/documents', {
        body: {
          data: { name: 'Body param test', clientMutationId: 'abc-123' },
        },
      });

      expect(res.status).toEqual(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Body param test');
      bodyParamTestDocumentId = res.body.data.documentId;
    });
  });

  /**
   * api.documents.strictParams (document service validation)
   *
   * When api.documents.strictParams is true, the document service rejects invalid root-level
   * params (e.g. invalid status, non-string locale). We test the document service directly
   * for status; invalid locale is covered by an E2E request.
   */
  describe('api.documents.strictParams (document service)', () => {
    afterEach(() => {
      strapi.config.set('api.documents.strictParams', undefined);
    });

    it('document service throws when strictParams is true and params have invalid status (non-D&P type)', async () => {
      strapi.config.set('api.documents.strictParams', true);
      await expect(
        strapi.documents('api::document.document').findMany({ status: 'invalid' })
      ).rejects.toThrow(/status|published|draft/i);
    });

    it('document service throws when strictParams is true and params have invalid status (D&P type)', async () => {
      strapi.config.set('api.documents.strictParams', true);
      await expect(
        strapi.documents('api::article.article').findMany({ status: 'invalid' })
      ).rejects.toThrow(/status|published|draft/i);
    });

    it('returns 400 when strictParams is true and request has invalid locale (non-string)', async () => {
      strapi.config.set('api.documents.strictParams', true);

      const res = await publicRq.get('/documents', { qs: { locale: 123 } });

      expect(res.status).toEqual(400);
      expect(res.body?.error?.message).toMatch(/locale|string/i);
    });

    it('allows valid locale string on non-localized type when strictParams is true (ignored downstream)', async () => {
      strapi.config.set('api.documents.strictParams', true);

      const res = await publicRq.get('/documents', { qs: { locale: 'en' } });

      expect(res.status).toEqual(200);
      expect(res.body?.data).toBeDefined();
    });
  });

  /**
   * Filters
   *
   * Parameter: filters
   * Notations: object
   */

  describe('Filters', () => {
    describe('No filters param', () => {
      it('Returns all the entities when no filters param is provided', async () => {
        const res = await rq.get('/api/documents');

        checkAPIResultLength(res, documentsLength());
      });
    });

    describe('object notation', () => {
      describe('ID', () => {
        it('works on non-existing ID', async () => {
          const res = await rq.get('/api/documents', { qs: { filters: { id: 999 } } });

          checkAPIResultLength(res, 0);
        });

        it('works on existing ID', async () => {
          const document = data.document[2];
          const res = await rq.get('/api/documents', { qs: { filters: { id: document.id } } });

          checkAPIResultLength(res, 1);
          expect(res.body.data[0]).toHaveProperty('id', document.id);
        });

        it.each([
          ['invalid attribute', { notAnAttribute: '' }],
          ['join table', { t0: { createdBy: { id: { $lt: '1' } } } }],
          ['invalid operator', { $fakeOp: false }],
          ['invalid operator case', { id: { $STARTSWITH: '123' } }],
          ['invalid attribute case', { ID: 1 }],
        ])('Returns 400 status on %s : %s', async (label, filters) => {
          const res = await rq.get('/api/documents', { qs: { filters } });

          expect(res.status).toEqual(400);
        });

        it.each([
          ['at root', { id: {} }],
          ['nested known keys', { id: { $eq: {} } }],
          ['complex nested known keys', { id: { $and: { $eq: {}, $contains: {} } } }],
          ['non-id complex nested known keys', { name: { $and: { $eq: {}, $contains: {} } } }],
          ['undefined', { name: undefined }], // not sure this is a possible path, but might as well test it
        ])('Empty objects are accepted but sanitized out: %s : %s', async (label, filters) => {
          const res = await rq.get('/api/documents', { qs: { filters } });

          expect(res.status).toEqual(200);
          checkAPIResultLength(res, documentsLength());
        });
      });

      describe('Scalar', () => {
        describe('Basic (no modifiers)', () => {
          it.each([
            ['$endsWith', { name: { $endsWith: 'B OO' } }, 1],
            ['$not > $endsWith', { $not: { name: { $endsWith: 'B OO' } } }, 2],
            ['$contains', { name: { $contains: 'Document' } }, documentsLength],
            ['Explicit $in', { misc: { $in: [2, 3, 42] } }, 2],
            ['Implicit $in', { misc: [2, 3, 42] }, 2],
          ])('Successfully applies filters: %s', async (_s, filters, expectedLength) => {
            const res = await rq.get('/api/documents', { qs: { filters } });

            checkAPIResultLength(res, expectedLength);
          });
        });

        describe('Private modifier', () => {
          it.each([
            ['$endsWith', { name_private: { $endsWith: 'None' } }],
            ['$not > $endsWith', { name_private: { $not: { $endsWith: 'None' } } }],
            ['$contains', { name_private: { $contains: 'C' } }],
            [
              'Explicit $in',
              { name_private: { $in: ['Private Document A', 'Private Document C'] } },
            ],
            ['Implicit $in', { name_private: ['Private Document A', 'Private Document C'] }],
          ])('Returns 400 status on invalid filters (%s)', async (_s, filters) => {
            const res = await rq.get('/api/documents', { qs: { filters } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Password', () => {
        describe('Basic (no modifiers)', () => {
          it.each([
            ['$endsWith', { password: { $endsWith: 'B' } }, documentsLength],
            ['$not > $endsWith', { $not: { password: { $endsWith: 'B' } } }, documentsLength],
            ['$contains', { password: { $contains: 'Document' } }, documentsLength],
          ])('Returns 400 status on invalid filters: %s', async (_s, filters, expectedLength) => {
            const res = await rq.get('/api/documents', { qs: { filters } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Relation', () => {
        describe('Scalar', () => {
          describe('Basic (no modifier)', () => {
            it.each([
              ['$endsWith', { relations: { name: { $endsWith: 'B' } } }, 2],
              ['$not > $endsWith', { $not: { relations: { name: { $endsWith: 'B' } } } }, 2],
              ['$contains', { relations: { name: { $contains: 'Relation' } } }, documentsLength],
            ])('Apply filters: %s', async (_s, filters, expectedlength) => {
              const res = await rq.get('/api/documents', { qs: { filters } });

              checkAPIResultLength(res, expectedlength);
            });
          });

          describe('Private modifier', () => {
            it.each([
              ['$endsWith', { relations: { name_private: { $endsWith: 'B' } } }, documentsLength],
              [
                '$not > $endsWith',
                { $not: { relations: { name_private: { $endsWith: 'B' } } } },
                documentsLength,
              ],
              [
                '$contains',
                { relations: { name_private: { $contains: 'Relation' } } },
                documentsLength,
              ],
            ])('Returns 400 status on invalid filters: %s', async (_s, filters, expectedlength) => {
              const res = await rq.get('/api/documents', { qs: { filters } });

              expect(res.status).toEqual(400);
            });
          });

          describe('Password', () => {
            describe('Basic (no modifiers)', () => {
              it.each([
                ['$endsWith', { relations: { password: { $endsWith: 'B' } } }, documentsLength],
                [
                  '$not > $endsWith',
                  { $not: { relations: { password: { $endsWith: 'B' } } } },
                  documentsLength,
                ],
                [
                  '$contains',
                  { relations: { password: { $contains: 'Document' } } },
                  documentsLength,
                ],
              ])(
                'Returns 400 status on inalid filters: %s',
                async (_s, filters, expectedLength) => {
                  const res = await rq.get('/api/documents', { qs: { filters } });

                  expect(res.status).toEqual(400);
                }
              );
            });
          });
        });
      });

      describe('Component', () => {
        describe('Scalar', () => {
          describe('Basic (no modifier)', () => {
            it.each([
              ['$endsWith', { componentA: { name: { $endsWith: 'B' } } }, 1],
              ['$not > $endsWith', { $not: { componentA: { name: { $endsWith: 'B' } } } }, 2],
              ['$contains', { componentA: { name: { $contains: 'Component' } } }, documentsLength],
            ])('Apply filters: %s', async (_s, filters, expectedlength) => {
              const res = await rq.get('/api/documents', { qs: { filters } });

              checkAPIResultLength(res, expectedlength);
            });
          });

          describe('Private modifier', () => {
            it.each([
              ['$endsWith', { componentA: { name_private: { $endsWith: 'B' } } }, documentsLength],
              [
                '$not > $endsWith',
                { $not: { componentA: { name_private: { $endsWith: 'B' } } } },
                documentsLength,
              ],
              [
                '$contains',
                { componentA: { name_private: { $contains: 'Component' } } },
                documentsLength,
              ],
            ])('Returns 400 status on invalid filters: %s', async (_s, filters, expectedlength) => {
              const res = await rq.get('/api/documents', { qs: { filters } });

              expect(res.status).toEqual(400);
            });
          });

          describe('Password', () => {
            describe('Basic (no modifiers)', () => {
              it.each([
                ['$endsWith', { componentA: { password: { $endsWith: 'B' } } }, documentsLength],
                [
                  '$not > $endsWith',
                  { $not: { componentA: { password: { $endsWith: 'B' } } } },
                  documentsLength,
                ],
                [
                  '$contains',
                  { componentA: { password: { $contains: 'Component' } } },
                  documentsLength,
                ],
              ])('Error on filters: %s', async (_s, filters, expectedLength) => {
                const res = await rq.get('/api/documents', { qs: { filters } });

                expect(res.status).toEqual(400);
              });
            });
          });
        });
      });

      describe('Custom (scalar)', () => {
        it.each([
          [
            'name $contains works',
            {
              name: { $contains: 'B OO' },
            },
            1,
          ],
          [
            'error with private',
            {
              $not: {
                name: { $contains: 'B OO' },
                name_private: { $contains: 'B' },
              },
            },
            null,
          ],
          [
            'error with password',
            {
              name: { $contains: 'B' },
              password: { $contains: 'B' },
            },
            null,
          ],
        ])('%s', async (_s, filters, expectedLength) => {
          const res = await rq.get('/api/documents', { qs: { filters } });

          if (expectedLength) {
            checkAPIResultLength(res, expectedLength);
          } else {
            expect(res.status).toEqual(400);
          }
        });
      });

      describe('Admin User Relations - Content API', () => {
        // Note: Validation for blocking private fields in admin user relations
        // works the same regardless of authentication (throwPrivate always runs via defaultValidateFilters).
        // We test both authenticated and unauthenticated cases to ensure consistency.

        describe('createdBy relation - private fields must be blocked', () => {
          it.each([
            ['email $startsWith', { createdBy: { email: { $startsWith: 'a' } } }],
            ['email $contains', { createdBy: { email: { $contains: 'admin' } } }],
            ['password $startsWith', { createdBy: { password: { $startsWith: '$2' } } }],
            [
              'resetPasswordToken $startsWith',
              { createdBy: { resetPasswordToken: { $startsWith: 'abc' } } },
            ],
            ['isActive $eq', { createdBy: { isActive: true } }],
            ['blocked $eq', { createdBy: { blocked: false } }],
          ])('Returns 400 on createdBy.%s filter (authenticated)', async (_label, filters) => {
            const res = await rq.get('/api/documents', { qs: { filters } });
            expect(res.status).toEqual(400);
          });

          it.each([
            ['email $startsWith', { createdBy: { email: { $startsWith: 'a' } } }],
            ['email $contains', { createdBy: { email: { $contains: 'admin' } } }],
            ['password $startsWith', { createdBy: { password: { $startsWith: '$2' } } }],
            [
              'resetPasswordToken $startsWith',
              { createdBy: { resetPasswordToken: { $startsWith: 'abc' } } },
            ],
            ['isActive $eq', { createdBy: { isActive: true } }],
            ['blocked $eq', { createdBy: { blocked: false } }],
          ])('Returns 400 on createdBy.%s filter (unauthenticated)', async (_label, filters) => {
            const res = await publicRq.get('/documents', { qs: { filters } });
            expect(res.status).toEqual(400);
          });
        });

        describe('updatedBy relation - private fields must be blocked', () => {
          it.each([
            ['email $startsWith', { updatedBy: { email: { $startsWith: 'a' } } }],
            ['email $contains', { updatedBy: { email: { $contains: 'admin' } } }],
            ['password $startsWith', { updatedBy: { password: { $startsWith: '$2' } } }],
            [
              'resetPasswordToken $startsWith',
              { updatedBy: { resetPasswordToken: { $startsWith: 'abc' } } },
            ],
            ['isActive $eq', { updatedBy: { isActive: true } }],
            ['blocked $eq', { updatedBy: { blocked: false } }],
          ])('Returns 400 on updatedBy.%s filter (authenticated)', async (_label, filters) => {
            const res = await rq.get('/api/documents', { qs: { filters } });
            expect(res.status).toEqual(400);
          });

          it.each([
            ['email $startsWith', { updatedBy: { email: { $startsWith: 'a' } } }],
            ['email $contains', { updatedBy: { email: { $contains: 'admin' } } }],
            ['password $startsWith', { updatedBy: { password: { $startsWith: '$2' } } }],
            [
              'resetPasswordToken $startsWith',
              { updatedBy: { resetPasswordToken: { $startsWith: 'abc' } } },
            ],
            ['isActive $eq', { updatedBy: { isActive: true } }],
            ['blocked $eq', { updatedBy: { blocked: false } }],
          ])('Returns 400 on updatedBy.%s filter (unauthenticated)', async (_label, filters) => {
            const res = await publicRq.get('/documents', { qs: { filters } });
            expect(res.status).toEqual(400);
          });
        });

        describe('nested operators with private fields', () => {
          it.each([
            [
              '$and with updatedBy.email',
              { $and: [{ updatedBy: { email: { $startsWith: 'a' } } }] },
            ],
            [
              '$or with createdBy.resetPasswordToken',
              { $or: [{ createdBy: { resetPasswordToken: { $startsWith: 'x' } } }] },
            ],
            [
              '$not with updatedBy.password',
              { $not: { updatedBy: { password: { $contains: 'hash' } } } },
            ],
          ])('Returns 400 on %s filter (authenticated)', async (_label, filters) => {
            const res = await rq.get('/api/documents', { qs: { filters } });
            expect(res.status).toEqual(400);
          });

          it.each([
            [
              '$and with updatedBy.email',
              { $and: [{ updatedBy: { email: { $startsWith: 'a' } } }] },
            ],
            [
              '$or with createdBy.resetPasswordToken',
              { $or: [{ createdBy: { resetPasswordToken: { $startsWith: 'x' } } }] },
            ],
            [
              '$not with updatedBy.password',
              { $not: { updatedBy: { password: { $contains: 'hash' } } } },
            ],
          ])('Returns 400 on %s filter (unauthenticated)', async (_label, filters) => {
            const res = await publicRq.get('/documents', { qs: { filters } });
            expect(res.status).toEqual(400);
          });
        });

        describe('Unrecognized top-level query params', () => {
          it.each([
            [
              'nested object param',
              { customFilter: { relation: { field: { $startsWith: 'x' } } } },
            ],
            ['plain param', { unknownKey: 'value' }],
          ])(
            'do not affect the response (authenticated) - %s',
            async (_label, unrecognizedParams) => {
              const base = await rq.get('/api/documents');
              const withParams = await rq.get('/api/documents', { qs: unrecognizedParams });
              expect(base.status).toEqual(200);
              expect(withParams.status).toEqual(200);
              expect(withParams.body.data).toHaveLength(base.body.data.length);
              expect(withParams.body.data.map((d) => d.id).sort()).toEqual(
                base.body.data.map((d) => d.id).sort()
              );
            }
          );

          it.each([
            [
              'nested object param',
              { customFilter: { relation: { field: { $startsWith: 'x' } } } },
            ],
            ['plain param', { unknownKey: 'value' }],
          ])(
            'do not affect the response (unauthenticated) - %s',
            async (_label, unrecognizedParams) => {
              const base = await publicRq.get('/documents');
              const withParams = await publicRq.get('/documents', { qs: unrecognizedParams });
              expect(base.status).toEqual(200);
              expect(withParams.status).toEqual(200);
              expect(withParams.body.data).toHaveLength(base.body.data.length);
              expect(withParams.body.data.map((d) => d.id).sort()).toEqual(
                base.body.data.map((d) => d.id).sort()
              );
            }
          );
        });
      });
    });
  });

  /**
   * Sort
   *
   * Parameter: sort
   * Notations: object, object[], string, string[]
   */

  describe('Sort', () => {
    const defaultDocumentsOrder = [1, 2, 3];

    describe('No sort param', () => {
      it('Use the default sort when no sort param is provided', async () => {
        const res = await rq.get('/api/documents');

        checkAPIResultOrder(res, defaultDocumentsOrder);
      });
    });

    describe('object notation', () => {
      describe('ID', () => {
        it('Successfully applies a sort:asc on the id', async () => {
          const res = await rq.get('/api/documents', { qs: { sort: { id: 'asc' } } });

          const order = sortByID(data.document, 'asc').map((d) => d.id);
          checkAPIResultOrder(res, order);
        });

        it('Successfully applies a sort:desc on the id', async () => {
          const res = await rq.get('/api/documents', { qs: { sort: { id: 'desc' } } });

          const order = sortByID(data.document, 'desc').map((d) => d.id);
          checkAPIResultOrder(res, order);
        });
      });

      describe('Scalar', () => {
        describe('Basic (no modifiers)', () => {
          it.each([
            ['name (asc)', { name: 'asc' }, [2, 3, 1]],
            ['name (desc)', { name: 'desc' }, [1, 3, 2]],
          ])('Successfully sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            checkAPIResultOrder(res, order);
          });
        });

        describe('Private modifier', () => {
          it.each([
            ['name_private (asc)', { name_private: 'asc' }, defaultDocumentsOrder],
            ['name_private (desc)', { name_private: 'desc' }, defaultDocumentsOrder],
          ])('Error with sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            expect(res.status).toEqual(400);
          });
        });

        describe('invalid modifier', () => {
          it.each([
            ['name_fake (asc)', { name_fake: 'asc' }, defaultDocumentsOrder],
            ['name_fake (desc)', { name_fake: 'desc' }, defaultDocumentsOrder],
          ])('Error with sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Password', () => {
        describe('Basic (no modifiers)', () => {
          it.each([
            ['password (asc)', { password: 'asc' }, defaultDocumentsOrder],
            ['password (desc)', { password: 'desc' }, defaultDocumentsOrder],
          ])('Error with sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            expect(res.status).toEqual(400);
          });
        });
      });

      // TODO: Nested sort returns duplicate results. Add back those tests when the issue will be fixed
      describe('Relation', () => {
        describe('Scalar', () => {
          describe.skip('Basic (no modifiers)', () => {
            it.each([
              ['relations.name (asc)', { relations: { name: 'asc' } }, [1, 3, 2]],
              ['relations.name (desc)', { relations: { name: 'desc' } }, [2, 1, 3]],
            ])('Successfully sort: %s', async (_s, sort, order) => {
              const res = await rq.get('/api/documents', { qs: { sort } });

              checkAPIResultOrder(res, order);
            });
          });

          describe('Private modifier', () => {
            it.each([
              [
                'relations.name_private (asc)',
                { relations: { name_private: 'asc' } },
                defaultDocumentsOrder,
              ],
              [
                'relations.name_private (desc)',
                { relations: { name_private: 'desc' } },
                defaultDocumentsOrder,
              ],
            ])('Error with sort: %s', async (_s, sort, order) => {
              const res = await rq.get('/api/documents', { qs: { sort } });

              expect(res.status).toEqual(400);
            });
          });
        });
      });

      describe('Custom (composed)', () => {
        it.each([
          ['password (asc) + name (asc)', { password: 'asc', name: 'asc' }, [2, 3, 1]],
          ['name_private (desc) + name (desc)', { name_private: 'desc', name: 'desc' }, [1, 3, 2]],
        ])('Error on sort: %s', async (_s, sort, order) => {
          const res = await rq.get('/api/documents', { qs: { sort } });

          expect(res.status).toEqual(400);
        });
      });

      describe('Admin User Relations - Content API', () => {
        it.each([
          ['updatedBy.email asc', { updatedBy: { email: 'asc' } }],
          ['createdBy.email desc', { createdBy: { email: 'desc' } }],
          ['updatedBy.password asc', { updatedBy: { password: 'asc' } }],
          ['createdBy.resetPasswordToken desc', { createdBy: { resetPasswordToken: 'desc' } }],
          ['updatedBy.isActive asc', { updatedBy: { isActive: 'asc' } }],
          ['createdBy.blocked desc', { createdBy: { blocked: 'desc' } }],
        ])('Returns 400 on %s sort (private field, authenticated)', async (_label, sort) => {
          const res = await rq.get('/api/documents', { qs: { sort } });
          expect(res.status).toEqual(400);
        });

        it.each([
          ['updatedBy.email asc', { updatedBy: { email: 'asc' } }],
          ['createdBy.email desc', { createdBy: { email: 'desc' } }],
          ['updatedBy.password asc', { updatedBy: { password: 'asc' } }],
          ['createdBy.resetPasswordToken desc', { createdBy: { resetPasswordToken: 'desc' } }],
          ['updatedBy.isActive asc', { updatedBy: { isActive: 'asc' } }],
          ['createdBy.blocked desc', { createdBy: { blocked: 'desc' } }],
        ])('Returns 400 on %s sort (private field, unauthenticated)', async (_label, sort) => {
          const res = await publicRq.get('/documents', { qs: { sort } });
          expect(res.status).toEqual(400);
        });
      });
    });

    describe('string notation', () => {
      describe('ID', () => {
        it('Successfully applies a default sort on the id', async () => {
          const res = await rq.get('/api/documents', { qs: { sort: 'id' } });

          const order = sortByID(data.document, 'asc').map((d) => d.id);
          checkAPIResultOrder(res, order);
        });

        it('Successfully applies a sort:asc on the id', async () => {
          const res = await rq.get('/api/documents', { qs: { sort: 'id:asc' } });

          const order = sortByID(data.document, 'asc').map((d) => d.id);
          checkAPIResultOrder(res, order);
        });

        it('Successfully applies a sort:desc on the id', async () => {
          const res = await rq.get('/api/documents', { qs: { sort: 'id:desc' } });

          const order = sortByID(data.document, 'desc').map((d) => d.id);
          checkAPIResultOrder(res, order);
        });
      });

      describe('Scalar', () => {
        describe('Basic (no modifiers)', () => {
          it.each([
            ['name', 'name', [2, 3, 1]],
            ['name (asc)', 'name:asc', [2, 3, 1]],
            ['name (desc)', 'name:desc', [1, 3, 2]],
          ])('Successfully sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            checkAPIResultOrder(res, order);
          });
        });

        describe('Private modifier', () => {
          it.each([
            ['name_private', 'name_private', defaultDocumentsOrder],
            ['name_private (asc)', 'name_private:asc', defaultDocumentsOrder],
            ['name_private (desc)', 'name_private:desc', defaultDocumentsOrder],
          ])('Error with sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            expect(res.status).toEqual(400);
          });
        });

        describe('invalid modifier', () => {
          it.each([
            ['name_invalid', 'name_invalid', defaultDocumentsOrder],
            ['name_invalid (asc)', 'name_invalid:asc', defaultDocumentsOrder],
            ['name_invalid (desc)', 'name_invalid:desc', defaultDocumentsOrder],
          ])('Error with sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Password', () => {
        describe('Basic (no modifiers)', () => {
          it.each([
            ['password', 'password', defaultDocumentsOrder],
            ['password (asc)', 'password:asc', defaultDocumentsOrder],
            ['password (desc)', 'password:desc', defaultDocumentsOrder],
          ])('Error with sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Custom (composed)', () => {
        it.each([
          ['password (asc) + name (asc)', 'password:asc,name:asc', [2, 3, 1]],
          ['name_private (desc) + name (desc)', 'name_private:desc,name:desc', [1, 3, 2]],
        ])('Error with sort: %s', async (_s, sort, order) => {
          const res = await rq.get('/api/documents', { qs: { sort } });

          expect(res.status).toEqual(400);
        });
      });
    });

    describe('object[] notation', () => {
      describe('ID', () => {
        it('Successfully applies a sort:asc on the id', async () => {
          const res = await rq.get('/api/documents', { qs: { sort: [{ id: 'asc' }] } });

          const order = sortByID(data.document, 'asc').map((d) => d.id);
          checkAPIResultOrder(res, order);
        });

        it('Successfully applies a sort:desc on the id', async () => {
          const res = await rq.get('/api/documents', { qs: { sort: [{ id: 'desc' }] } });

          const order = sortByID(data.document, 'desc').map((d) => d.id);
          checkAPIResultOrder(res, order);
        });
      });

      describe('Scalar', () => {
        describe('Basic (no modifiers)', () => {
          it.each([
            ['name (asc)', [{ name: 'asc' }], [2, 3, 1]],
            ['name (desc)', [{ name: 'desc' }], [1, 3, 2]],
          ])('Successfully sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            checkAPIResultOrder(res, order);
          });
        });

        describe('Private modifier', () => {
          it.each([
            ['name_private (asc)', [{ name_private: 'asc' }], defaultDocumentsOrder],
            ['name_private (desc)', [{ name_private: 'desc' }], defaultDocumentsOrder],
          ])('Error on sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            expect(res.status).toEqual(400);
          });
        });

        describe('invalid modifier', () => {
          it.each([
            ['name_invalid (asc)', [{ name_invalid: 'asc' }], defaultDocumentsOrder],
            ['name_invalid (desc)', [{ name_private: 'desc' }], defaultDocumentsOrder],
          ])('Error on sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Password', () => {
        describe('Basic (no modifiers)', () => {
          it.each([
            ['password (asc)', [{ password: 'asc' }], defaultDocumentsOrder],
            ['password (desc)', [{ password: 'desc' }], defaultDocumentsOrder],
          ])('Error on sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Custom (composed)', () => {
        it.each([
          [
            'private_name (asc) + password (asc)',
            [{ private_name: 'asc' }, { password: 'asc' }],
            defaultDocumentsOrder,
          ],
          [
            'private_name (asc) + name (asc)',
            [{ private_name: 'asc' }, { name: 'asc' }],
            [2, 3, 1],
          ],
          ['password (asc) + name (asc)', [{ password: 'asc' }, { name: 'asc' }], [2, 3, 1]],
          ['password (desc) + name (desc)', [{ password: 'desc' }, { name: 'desc' }], [1, 3, 2]],
        ])('Error on sort: %s', async (_s, sort, order) => {
          const res = await rq.get('/api/documents', { qs: { sort } });

          expect(res.status).toEqual(400);
        });
      });
    });

    describe('string[] notation', () => {
      describe('ID', () => {
        it('Successfully applies a default sort on the id', async () => {
          const res = await rq.get('/api/documents', { qs: { sort: ['id'] } });

          const order = sortByID(data.document, 'asc').map((d) => d.id);
          checkAPIResultOrder(res, order);
        });

        it('Successfully applies a sort:asc on the id', async () => {
          const res = await rq.get('/api/documents', { qs: { sort: ['id:asc'] } });

          const order = sortByID(data.document, 'asc').map((d) => d.id);
          checkAPIResultOrder(res, order);
        });

        it('Successfully applies a sort:desc on the id', async () => {
          const res = await rq.get('/api/documents', { qs: { sort: ['id:desc'] } });

          const order = sortByID(data.document, 'desc').map((d) => d.id);
          checkAPIResultOrder(res, order);
        });
      });

      describe('Scalar', () => {
        describe('Basic (no modifiers)', () => {
          it.each([
            ['name (asc)', ['name'], [2, 3, 1]],
            ['name (asc)', ['name:asc'], [2, 3, 1]],
            ['name (desc)', ['name:desc'], [1, 3, 2]],
          ])('Successfully sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            checkAPIResultOrder(res, order);
          });
        });

        describe('Private modifier', () => {
          it.each([
            ['name_private (asc)', ['name_private'], defaultDocumentsOrder],
            ['name_private (asc)', ['name_private:asc'], defaultDocumentsOrder],
            ['name_private (desc)', ['name_private:desc'], defaultDocumentsOrder],
          ])('Error on sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Password', () => {
        describe('Basic (no modifiers)', () => {
          it.each([
            ['password (asc)', ['password'], defaultDocumentsOrder],
            ['password (asc)', ['password:asc'], defaultDocumentsOrder],
            ['password (desc)', ['password:desc'], defaultDocumentsOrder],
          ])('Error on sort: %s', async (_s, sort, order) => {
            const res = await rq.get('/api/documents', { qs: { sort } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Custom (composed)', () => {
        it.each([
          [
            'private_name (asc) + password (asc)',
            ['private_name:asc', 'password:asc'],
            defaultDocumentsOrder,
          ],
          ['private_name (asc) + name (asc)', ['private_name:asc', 'name:asc'], [2, 3, 1]],
          ['password (default) + name (asc)', ['password', 'name:asc'], [2, 3, 1]],
          ['password (desc) + name (default)', ['password:desc', 'name'], [2, 3, 1]],
          [
            'password (desc) + name (desc) + private_name (default)',
            ['password:desc', 'name:desc', 'private_name'],
            [1, 3, 2],
          ],
        ])('Error on sort: %s', async (_s, sort, order) => {
          const res = await rq.get('/api/documents', { qs: { sort } });

          expect(res.status).toEqual(400);
        });
      });
    });
  });

  /**
   * Fields
   *
   * Parameter: fields
   * Notations: string, string[]
   */

  describe('Fields', () => {
    const allDocumentFields = [
      // TODO: Sanitize id field
      'id',
      'documentId',
      'name',
      'name_non_searchable',
      'name_hidden',
      'name_non_writable',
      'misc',
      'createdAt',
      'updatedAt',
      'publishedAt',
    ];

    describe('No fields param', () => {
      it('Select all fields sort when no fields param is provided', async () => {
        const res = await rq.get('/api/documents');

        checkAPIResultFields(res, allDocumentFields);
      });
    });

    describe('string notation', () => {
      describe('Scalar', () => {
        describe('Basic (no modifiers)', () => {
          it('Successfully select a field: name', async () => {
            const res = await rq.get('/api/documents', { qs: { fields: 'name' } });

            checkAPIResultFields(res, ['id', 'documentId', 'name']);
          });
        });

        describe('Private modifier', () => {
          it('Error with fields parameter: name_private', async () => {
            const res = await rq.get('/api/documents', { qs: { fields: 'name_private' } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Password', () => {
        describe('Basic (no modifiers)', () => {
          it('Error with fields parameter (password)', async () => {
            const res = await rq.get('/api/documents', { qs: { fields: 'password' } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Custom', () => {
        it('Select all fields when using the wildcard (*) symbol', async () => {
          const res = await rq.get('/api/documents', { qs: { fields: '*' } });

          checkAPIResultFields(res, allDocumentFields);
        });
      });
    });

    describe('string[] notation', () => {
      describe('Scalar', () => {
        describe('Basic (no modifiers)', () => {
          it('Successfully select a field: name', async () => {
            const res = await rq.get('/api/documents', { qs: { fields: ['name'] } });

            checkAPIResultFields(res, ['id', 'documentId', 'name']);
          });
        });

        describe('Private modifier', () => {
          it(`Error if any field invalid: [name_private]`, async () => {
            const res = await rq.get('/api/documents', { qs: { fields: ['name_private'] } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Password', () => {
        describe('Basic (no modifiers)', () => {
          it(`Error if any field invalid: [password]`, async () => {
            const res = await rq.get('/api/documents', { qs: { fields: ['password'] } });

            expect(res.status).toEqual(400);
          });
        });
      });

      describe('Custom', () => {
        it('Select all fields when using the wildcard (*) symbol', async () => {
          const res = await rq.get('/api/documents', { qs: { fields: ['*'] } });

          checkAPIResultFields(res, allDocumentFields);
        });

        // With qs, { fields: [] } serializes to { }
        // It doesn't unit test the case where we want to pass fields=[] to the low level sanitazition method
        it('Select all fields when using an empty array', async () => {
          const res = await rq.get('/api/documents', { qs: { fields: [] } });

          checkAPIResultFields(res, allDocumentFields);
        });

        it('Error if any fields inalid: [*, name, password]', async () => {
          const res = await rq.get('/api/documents', { qs: { fields: ['*', 'name', 'password'] } });

          expect(res.status).toEqual(400);
        });

        it('Select only requested fields: [name, misc]', async () => {
          const res = await rq.get('/api/documents', { qs: { fields: ['name', 'misc'] } });

          checkAPIResultFields(res, ['id', 'documentId', 'name', 'misc']);
        });
      });
    });
  });

  describe('Search', () => {
    describe('No search param', () => {
      it('Return all entities if no search param is provided', async () => {
        const res = await rq.get('/api/documents');

        checkAPIResultLength(res, documentsLength());
      });
    });

    describe('string notation', () => {
      describe('Scalar', () => {
        describe('Basic (no modifiers)', () => {
          it.each([
            ['Document A', 1],
            [' OO', 2],
            ['Document', documentsLength],
          ])('Successfully applies search: %s', async (search, expectedLength) => {
            const res = await rq.get('/api/documents', { qs: { _q: search } });

            checkAPIResultLength(res, expectedLength);
          });
        });

        describe('Private modifier', () => {
          it.each([
            ['Private', documentsLength],
            ['Random unknown string', 0],
          ])(
            'Successfully applies search on private attributes: %s',
            async (search, expectedLength) => {
              const res = await rq.get('/api/documents', { qs: { _q: search } });

              checkAPIResultLength(res, expectedLength);
            }
          );
        });

        describe('Non-Searchable modifier', () => {
          it('Do not search on non-searchable atttributes: No Search', async () => {
            const res = await rq.get('/api/documents', { qs: { _q: 'No Search' } });

            checkAPIResultLength(res, 0);
          });
        });
      });

      describe('Password', () => {
        describe('Basic (no modifiers)', () => {
          it('Do not search on password atttributes: Password', async () => {
            const res = await rq.get('/api/documents', { qs: { _q: 'Password' } });

            checkAPIResultLength(res, 0);
          });
        });
      });
    });
  });

  describe('Populate', () => {
    describe('object notation', () => {
      it('Populates the given relation', async () => {
        const populate = { relations: true };
        const res = await rq.get('/api/documents', { qs: { populate } });

        checkAPIResultValidity(res);

        res.body.data.forEach((document) => {
          expect(document).toHaveProperty('relations', expect.any(Array));
        });
      });

      it('Does not populate private relation', async () => {
        const populate = { private_relations: true };
        const res = await rq.get('/api/documents', { qs: { populate } });

        expect(res.status).toBe(400);
      });

      it.todo('Populates a nested relation');

      it.todo('Populates a media');

      describe('Dynamic Zone', () => {
        it.each([
          [{ dz: { on: { 'default.component-a': true } } }, 'default.component-a', 2],
          [{ dz: { on: { 'default.component-b': true } } }, 'default.component-b', 1],
        ])(
          'Populates a dynamic-zone using populate fragments (%s)',
          async (populate, componentUID, expectedLength) => {
            const res = await rq.get('/api/documents', { qs: { populate } });

            checkAPIResultValidity(res);

            res.body.data.forEach((document) => {
              expect(document).toHaveProperty(
                'dz',
                expect.arrayContaining([expect.objectContaining({ __component: componentUID })])
              );
              expect(document.dz).toHaveLength(expectedLength);
            });
          }
        );

        it(`Error with dynamic zone on empty populate fragment definition`, async () => {
          const res = await rq.get('/api/documents', { qs: { populate: { dz: { on: {} } } } });

          checkAPIResultValidity(res);

          res.body.data.forEach((document) => {
            expect(document).not.toHaveProperty('dz');
          });
        });

        it.todo('Nested filtering on dynamic zone populate');

        it.todo('Nested field selection on dynamic zone populate');

        it.todo(`Sort populated dynamic zone's components`);
      });
    });

    describe('string notation', () => {
      it('Populates a relation', async () => {
        const populate = 'relations';
        const res = await rq.get('/api/documents', { qs: { populate } });

        checkAPIResultValidity(res);

        res.body.data.forEach((document) => {
          expect(document).toHaveProperty('relations', expect.any(Array));
        });
      });

      it.todo('Populates a nested relation');

      it.todo('Populates a media');

      it('Populates a dynamic-zone', async () => {
        const populate = 'dz';
        const res = await rq.get('/api/documents', { qs: { populate } });

        checkAPIResultValidity(res);

        res.body.data.forEach((document) => {
          expect(document).toHaveProperty(
            'dz',
            expect.arrayContaining([expect.objectContaining({ __component: expect.any(String) })])
          );
        });
      });
    });

    describe('string[] notation', () => {
      it('Populates the given relation', async () => {
        const populate = ['relations'];
        const res = await rq.get('/api/documents', { qs: { populate } });

        checkAPIResultValidity(res);

        res.body.data.forEach((document) => {
          expect(document).toHaveProperty('relations', expect.any(Array));
        });
      });

      it.todo('Populates a nested relation');

      it.todo('Populates a media');

      it('Populates a dynamic-zone', async () => {
        const populate = ['dz'];
        const res = await rq.get('/api/documents', { qs: { populate } });

        checkAPIResultValidity(res);

        res.body.data.forEach((document) => {
          expect(document).toHaveProperty(
            'dz',
            expect.arrayContaining([expect.objectContaining({ __component: expect.any(String) })])
          );
        });
      });
    });
  });
});

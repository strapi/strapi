'use strict';

const { values, zip, symmetricDifference } = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const resources = require('./resources');

const { fixtures, schemas } = resources;

const builder = createTestBuilder();

let data;
let strapi;
let rq;

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
      'locale',
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

import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

/**
 * A plain object is never a valid operand for an operator on a scalar or JSON attribute.
 * Validation must reject it: if it gets through, query conversion strips the object's keys,
 * drops the whole condition, and the query returns every row.
 */

const CATEGORY_UID = 'api::op-category.op-category';
const NOTE_UID = 'api::op-note.op-note';

const categoryModel = {
  kind: 'collectionType',
  displayName: 'op-category',
  singularName: 'op-category',
  pluralName: 'op-categories',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

const noteModel = {
  kind: 'collectionType',
  displayName: 'op-note',
  singularName: 'op-note',
  pluralName: 'op-notes',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    meta: { type: 'json' },
    rank: { type: 'integer' },
    category: {
      type: 'relation',
      relation: 'manyToOne',
      target: CATEGORY_UID,
    },
  },
};

type Note = { documentId: string; title: string };

const builder = createTestBuilder();
let strapi: Core.Strapi;
let rq: (options: { method: string; url: string; qs?: Record<string, unknown> }) => Promise<{
  statusCode: number;
  body: { data?: Note[]; error?: Record<string, unknown> };
}>;

const findNotes = (filters: Record<string, unknown>) => {
  return strapi.documents(NOTE_UID).findMany({ filters } as any) as unknown as Promise<Note[]>;
};

const getNotes = (filters: Record<string, unknown>) => {
  return rq({ method: 'GET', url: '/op-notes', qs: { filters } });
};

const titles = (notes: Note[] | undefined) => (notes ?? []).map((note) => note.title).sort();

describe('Filtering with object operands on scalar and JSON attributes', () => {
  beforeAll(async () => {
    await builder.addContentTypes([categoryModel, noteModel]).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    const category = await strapi.documents(CATEGORY_UID).create({ data: { name: 'Cat A' } });

    await strapi.documents(NOTE_UID).create({
      data: {
        title: 'Note 1',
        meta: { a: 1, tags: ['x'] },
        rank: 1,
        category: category.documentId,
      },
    });
    await strapi.documents(NOTE_UID).create({
      data: { title: 'Note 2', meta: { a: 2 }, rank: 2 },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  // Each of these filters has no matching row. Before the fix, every one of them returned both rows.
  const rejectedFilters: Array<[string, Record<string, unknown>]> = [
    ['$eq with an object on a string attribute', { title: { $eq: { a: 1 } } }],
    ['$eq with an object on a JSON attribute', { meta: { $eq: { a: 999 } } }],
    ['$contains with an object on a JSON attribute', { meta: { $contains: { a: 1 } } }],
    ['an object operand nested under $not', { meta: { $not: { $eq: { a: 999 } } } }],
    ['an object operand nested under $and', { meta: { $and: { $eq: { a: 999 } } } }],
    ['an object operand whose key is an attribute name', { meta: { $eq: { title: 'x' } } }],
    ['$eq with an object on documentId', { documentId: { $eq: { a: 1 } } }],
  ];

  describe('Document Service', () => {
    test.each(rejectedFilters)('rejects %s', async (_, filters) => {
      await expect(findNotes(filters)).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  describe('REST', () => {
    test.each(rejectedFilters)('returns a 400 for %s', async (_, filters) => {
      const res = await getNotes(filters);

      expect(res.body.data).toBeNull();
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({ status: 400, name: 'ValidationError' });
    });

    // The strapi::query middleware parses the query string with an arrayLimit of 100,
    // so a longer list reaches validation as an object keyed by index
    test('returns a 400 naming arrayLimit for an $in list of 101 items', async () => {
      const ids = Array.from({ length: 101 }, (_, index) => index + 1);
      const res = await getNotes({ rank: { $in: ids } });

      expect(res.body.data).toBeNull();
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({
        status: 400,
        name: 'ValidationError',
        message:
          "Invalid operand for $in at rank: the list has more items than the query parser's arrayLimit. Send fewer items, or raise arrayLimit in the strapi::query middleware config",
      });
    });

    test('accepts an $in list of 100 items', async () => {
      const ids = Array.from({ length: 100 }, (_, index) => index + 1);
      const res = await getNotes({ rank: { $in: ids } });

      expect(res.statusCode).toBe(200);
      expect(titles(res.body.data)).toEqual(['Note 1', 'Note 2']);
    });
  });

  // Operands that are not plain objects, and the operator map of $not, keep working.
  const acceptedFilters: Array<[string, Record<string, unknown>, string[]]> = [
    ['a scalar $eq operand', { title: { $eq: 'Note 1' } }, ['Note 1']],
    ['an implicit $eq', { title: 'Note 2' }, ['Note 2']],
    ['an $in array', { rank: { $in: [1, 2] } }, ['Note 1', 'Note 2']],
    ['a $notIn array', { rank: { $notIn: [1] } }, ['Note 2']],
    ['a $between array', { rank: { $between: [1, 1] } }, ['Note 1']],
    ['$null', { rank: { $null: true } }, []],
    ['$notNull', { rank: { $notNull: true } }, ['Note 1', 'Note 2']],
    // Query conversion casts any $null / $notNull operand to a boolean, so an object means true
    ['$null with an object', { rank: { $null: { a: 1 } } }, []],
    ['the operator map of $not', { title: { $not: { $eq: 'Note 1' } } }, ['Note 2']],
    ['a nested relation filter', { category: { name: { $eq: 'Cat A' } } }, ['Note 1']],
    [
      '$and and $or arrays',
      { $or: [{ title: 'Note 1' }, { rank: { $gt: 1 } }] },
      ['Note 1', 'Note 2'],
    ],
  ];

  describe('legitimate operands', () => {
    test.each(acceptedFilters)('Document Service accepts %s', async (_, filters, expected) => {
      expect(titles(await findNotes(filters))).toEqual(expected);
    });

    test.each(acceptedFilters)('REST accepts %s', async (_, filters, expected) => {
      const res = await getNotes(filters);

      expect(res.statusCode).toBe(200);
      expect(titles(res.body.data)).toEqual(expected);
    });

    test('Document Service accepts a Date operand on a datetime attribute', async () => {
      const notes = await findNotes({ createdAt: { $gt: new Date(0) } });

      expect(titles(notes)).toEqual(['Note 1', 'Note 2']);
    });

    // Mirrors the content types filter review workflows builds for each dialect
    test('Document Service accepts the string operand of a JSON attribute filter', async () => {
      const filters = strapi.db.dialect.supportsOperator('$jsonSupersetOf')
        ? { meta: { $jsonSupersetOf: JSON.stringify({ a: 1 }) } }
        : { meta: { $contains: '"tags"' } };

      expect(titles(await findNotes(filters))).toEqual(['Note 1']);
    });
  });
});

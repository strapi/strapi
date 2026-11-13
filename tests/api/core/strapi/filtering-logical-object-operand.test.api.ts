import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

/**
 * The strapi::query middleware parses the query string with an arrayLimit of 100. A `$or` or `$and`
 * list longer than that, or with an index of 100 or more, reaches validation as an object keyed by
 * index. Validation must reject it: if it gets through, query conversion drops the whole condition,
 * and the query returns every row.
 */

const CATEGORY_UID = 'api::lop-category.lop-category';
const NOTE_UID = 'api::lop-note.lop-note';

const categoryModel = {
  kind: 'collectionType',
  displayName: 'lop-category',
  singularName: 'lop-category',
  pluralName: 'lop-categories',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

const noteModel = {
  kind: 'collectionType',
  displayName: 'lop-note',
  singularName: 'lop-note',
  pluralName: 'lop-notes',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
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

const getNotes = (filters: Record<string, unknown>) => {
  return rq({ method: 'GET', url: '/lop-notes', qs: { filters } });
};

const titles = (notes: Note[] | undefined) => (notes ?? []).map((note) => note.title).sort();

/** `count` conditions on `key`, of which only the first one can match. */
const conditions = (count: number, key: string, value: string) =>
  Array.from({ length: count }, (_, index) => ({
    [key]: index === 0 ? value : `${value} ${index}`,
  }));

/** `count` conditions that all hold for Note 1 only. */
const noteOneConditions = (count: number) => [
  { rank: 1 },
  ...Array.from({ length: count - 1 }, (_, index) => ({ title: { $ne: `Note ${index + 3}` } })),
];

const arrayLimitMessage = (operator: string, path: string) =>
  `Invalid operand for ${operator} at ${path}: the list has more items than the query parser's arrayLimit. Send fewer items, or raise arrayLimit in the strapi::query middleware config`;

describe('Filtering with object-shaped $or and $and operands', () => {
  beforeAll(async () => {
    await builder.addContentTypes([categoryModel, noteModel]).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    const category = await strapi.documents(CATEGORY_UID).create({ data: { name: 'Cat A' } });

    await strapi.documents(NOTE_UID).create({
      data: { title: 'Note 1', rank: 1, category: category.documentId },
    });
    await strapi.documents(NOTE_UID).create({ data: { title: 'Note 2', rank: 2 } });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  // Each of these filters matches at most Note 1. Before the fix, every one of them returned both rows.
  const rejectedFilters: Array<[string, Record<string, unknown>, string, string]> = [
    ['$or with 101 conditions', { $or: conditions(101, 'title', 'Note 1') }, '$or', '$or'],
    ['$and with 101 conditions', { $and: noteOneConditions(101) }, '$and', '$and'],
    ['a sparse $or', { $or: { 100: { title: 'Note 1' } } }, '$or', '$or'],
    ['a sparse $and', { $and: { 100: { title: 'Note 1' } } }, '$and', '$and'],
    [
      '$or with 101 conditions in a relation filter',
      { category: { $or: conditions(101, 'name', 'Cat A') } },
      '$or',
      'category.$or',
    ],
    [
      'a sparse $and in a relation filter',
      { category: { $and: { 100: { name: 'Cat A' } } } },
      '$and',
      'category.$and',
    ],
    [
      '$or with 101 conditions under $not',
      { $not: { $or: conditions(101, 'title', 'Note 2') } },
      '$or',
      '$not.$or',
    ],
    [
      'a sparse $and under $not',
      { $not: { $and: { 100: { title: 'Note 2' } } } },
      '$and',
      '$not.$and',
    ],
  ];

  test.each(rejectedFilters)(
    'returns a 400 naming arrayLimit for %s',
    async (_, filters, key, path) => {
      const res = await getNotes(filters);

      expect(res.body.data).toBeNull();
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({
        status: 400,
        name: 'ValidationError',
        message: arrayLimitMessage(key, path),
      });
    }
  );

  // A $or or $and operand keyed by operators is not a list either. The database layer reads a group
  // only from a list and rejects it with a 500, so validation must answer a 400 first.
  const operatorKeyedFilters: Array<[string, string, string, string]> = [
    ['a $or keyed by $eq', 'filters[$or][$eq]=Note%201', '$or', '$or'],
    ['a $and keyed by $not', 'filters[$and][$not][title]=Note%201', '$and', '$and'],
    [
      'a $or keyed by $eq in a relation filter',
      'filters[category][$or][$eq]=1',
      '$or',
      'category.$or',
    ],
    ['a $and keyed by $eq under $not', 'filters[$not][$and][$eq]=x', '$and', '$not.$and'],
    [
      'the operator map of $or on a scalar attribute',
      'filters[title][$or][$eq]=Note%201',
      '$or',
      'title.$or',
    ],
  ];

  // The object operand check of a root operator sees the index-keyed `$eq` operand first
  test('returns a 400 naming arrayLimit for a $or keyed by $eq with an index-keyed operand', async () => {
    const res = await rq({
      method: 'GET',
      url: '/lop-notes?filters[$or][$eq][0]=Note%201&filters[$or][$eq][100]=x',
    });

    expect(res.body.data).toBeNull();
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatchObject({
      status: 400,
      name: 'ValidationError',
      message: arrayLimitMessage('$eq', '$or'),
    });
  });

  test.each(operatorKeyedFilters)('returns a 400 for %s', async (_, query, key, path) => {
    const res = await rq({ method: 'GET', url: `/lop-notes?${query}` });

    expect(res.body.data).toBeNull();
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatchObject({
      status: 400,
      name: 'ValidationError',
      message: `Invalid operand for ${key} at ${path}: expected a list of filters, at the root of the filters or under a relation, not an object`,
    });
  });

  const acceptedFilters: Array<[string, Record<string, unknown>, string[]]> = [
    ['$or with 100 conditions', { $or: conditions(100, 'title', 'Note 1') }, ['Note 1']],
    ['$and with 100 conditions', { $and: noteOneConditions(100) }, ['Note 1']],
    [
      '$or with 100 conditions in a relation filter',
      { category: { $or: conditions(100, 'name', 'Cat A') } },
      ['Note 1'],
    ],
    [
      '$or with 100 conditions under $not',
      { $not: { $or: conditions(100, 'title', 'Note 2') } },
      ['Note 1'],
    ],
    ['a $or list', { $or: [{ title: 'Note 1' }, { rank: { $gt: 1 } }] }, ['Note 1', 'Note 2']],
  ];

  test.each(acceptedFilters)('accepts %s', async (_, filters, expected) => {
    const res = await getNotes(filters);

    expect(res.statusCode).toBe(200);
    expect(titles(res.body.data)).toEqual(expected);
  });

  // Query conversion reads a $null / $notNull operand as a boolean and rejects any other value,
  // an object included, so a $or / $and operand there never reaches the query
  const nullOperandFilters: Array<[string, Record<string, unknown>]> = [
    ['$or in a $null operand', { title: { $null: { $or: { a: 1 } } } }],
    ['$and in a $notNull operand', { title: { $notNull: { $and: { a: 1 } } } }],
    ['a $or keyed by $eq in a $null operand', { title: { $null: { $or: { $eq: 1 } } } }],
  ];

  test.each(nullOperandFilters)('returns a 400 for %s', async (_, filters) => {
    const res = await getNotes(filters);

    expect(res.body.data).toBeNull();
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatchObject({
      status: 400,
      name: 'ValidationError',
      message: 'Invalid boolean, expected one of true, t, 1, false, f, 0 (case-insensitive)',
    });
  });
});

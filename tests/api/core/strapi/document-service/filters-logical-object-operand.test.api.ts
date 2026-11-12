import type { Core, UID } from '@strapi/types';
import { errors } from '@strapi/utils';

import { createStrapiInstance } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';

/**
 * The Document Service validates its filters before it reads or writes. A `$or` or `$and` operand
 * must be a list: the database layer rejects any other operand, and query conversion drops one with
 * nothing valid left in it, so the query matches every row.
 */

const CATEGORY_UID = 'api::dslo-category.dslo-category' as UID.ContentType;
const NOTE_UID = 'api::dslo-note.dslo-note' as UID.ContentType;

const categoryModel = {
  kind: 'collectionType',
  displayName: 'dslo-category',
  singularName: 'dslo-category',
  pluralName: 'dslo-categories',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

const noteModel = {
  kind: 'collectionType',
  displayName: 'dslo-note',
  singularName: 'dslo-note',
  pluralName: 'dslo-notes',
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
let noteTwo: Note;

const titles = (notes: Note[]) => notes.map((note) => note.title).sort();

const arrayLimitMessage = (operator: string, path: string) =>
  `Invalid operand for ${operator} at ${path}: the list has more items than the query parser's arrayLimit. Send fewer items, or raise arrayLimit in the strapi::query middleware config`;

const objectMessage = (operator: string, path: string) =>
  `Invalid operand for ${operator} at ${path}: expected an array of filters, not an object`;

describe('Document Service filters with object-shaped $or and $and operands', () => {
  beforeAll(async () => {
    await builder.addContentTypes([categoryModel, noteModel]).build();

    strapi = await createStrapiInstance();

    const category = await strapi.documents(CATEGORY_UID).create({ data: { name: 'Cat A' } });

    await strapi.documents(NOTE_UID).create({
      data: { title: 'Note 1', rank: 1, category: category.documentId },
    });
    noteTwo = (await strapi.documents(NOTE_UID).create({
      data: { title: 'Note 2', rank: 2 },
    })) as unknown as Note;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  // Each of these filters matches at most Note 1, or fails in the database layer
  const rejectedFilters: Array<[string, Record<string, unknown>, string]> = [
    [
      'an index-keyed $or',
      { $or: { 0: { title: 'Note 1' }, 1: { rank: 1 } } },
      arrayLimitMessage('$or', '$or'),
    ],
    ['a sparse $and', { $and: { 100: { title: 'Note 1' } } }, arrayLimitMessage('$and', '$and')],
    ['a $or keyed by an attribute', { $or: { title: 'Note 1' } }, objectMessage('$or', '$or')],
    [
      'a sparse $or in a relation filter',
      { category: { $or: { 100: { name: 'Cat A' } } } },
      arrayLimitMessage('$or', 'category.$or'),
    ],
    [
      'a $and keyed by an attribute under $not',
      { $not: { $and: { title: 'Note 2' } } },
      objectMessage('$and', '$not.$and'),
    ],
    ['a $or keyed by an operator', { $or: { $eq: 'Note 1' } }, objectMessage('$or', '$or')],
    [
      'a $and keyed by an operator with an index-keyed operand',
      { $and: { $eq: { 0: 'Note 1', 100: 'x' } } },
      objectMessage('$and', '$and'),
    ],
    [
      'a $or keyed by an operator in a relation filter',
      { category: { $or: { $not: { name: 'Cat A' } } } },
      objectMessage('$or', 'category.$or'),
    ],
    [
      'the operator map of $and on a scalar attribute',
      { title: { $and: { $eq: 'Note 1' } } },
      objectMessage('$and', 'title.$and'),
    ],
  ];

  describe.each(['findMany', 'findFirst', 'count'] as const)('%s', (method) => {
    test.each(rejectedFilters)('throws a ValidationError for %s', async (_, filters, message) => {
      const error = await strapi
        .documents(NOTE_UID)
        [method]({ filters } as never)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(errors.ValidationError);
      expect(error).toMatchObject({ message });
    });
  });

  const acceptedFilters: Array<[string, Record<string, unknown>, string[]]> = [
    ['a $or list', { $or: [{ title: 'Note 1' }, { rank: { $gt: 1 } }] }, ['Note 1', 'Note 2']],
    ['a $and list in a relation filter', { category: { $and: [{ name: 'Cat A' }] } }, ['Note 1']],
    ['a $or list of operator filters', { $or: [{ $not: { title: 'Note 1' } }] }, ['Note 2']],
    [
      'the operator map of $not on a scalar attribute',
      { title: { $not: { $eq: 'Note 1' } } },
      ['Note 2'],
    ],
    ['an empty $or', { $or: {} }, ['Note 1', 'Note 2']],
  ];

  test.each(acceptedFilters)('findMany accepts %s', async (_, filters, expected) => {
    const notes = await strapi.documents(NOTE_UID).findMany({ filters } as never);

    expect(titles(notes as unknown as Note[])).toEqual(expected);
  });

  // The $or / $and check skips a $null / $notNull operand: query conversion reads it, and rejects one
  // that is not a boolean
  test.each([
    ['a $or in a $null operand', { title: { $null: { $or: { $eq: 1 } } } }],
    ['a $and in a $notNull operand', { title: { $notNull: { $and: { a: 1 } } } }],
  ])('findMany throws the $null operand error for %s', async (_, filters) => {
    const error = await strapi
      .documents(NOTE_UID)
      .findMany({ filters } as never)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(errors.ValidationError);
    expect(error).toMatchObject({
      message: 'Invalid boolean, expected one of true, t, 1, false, f, 0 (case-insensitive)',
    });
  });

  // Runs last: before the fix, this delete removed Note 2
  test('delete throws before it deletes a document the filter does not match', async () => {
    const error = await strapi
      .documents(NOTE_UID)
      .delete({
        documentId: noteTwo.documentId,
        filters: { $and: { $eq: { 0: 'Note 1', 100: 'x' } } },
      } as never)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(errors.ValidationError);
    expect(error).toMatchObject({ message: objectMessage('$and', '$and') });

    const remaining = await strapi.documents(NOTE_UID).findMany();
    expect(titles(remaining as unknown as Note[])).toEqual(['Note 1', 'Note 2']);
  });
});

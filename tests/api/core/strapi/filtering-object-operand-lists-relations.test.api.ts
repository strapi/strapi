import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

/**
 * A plain object is never a valid operand inside an operand list, nor for an operator on a
 * relation, media or component attribute. Validation must reject it: if it gets through, query
 * conversion strips the object's keys, empties the list or drops the whole condition, and the
 * query returns every row.
 */

const CATEGORY_UID = 'api::ol-category.ol-category';
const NOTE_UID = 'api::ol-note.ol-note';

const seoComponent = {
  displayName: 'ol-seo',
  attributes: {
    metaTitle: { type: 'string' },
  },
};

const categoryModel = {
  kind: 'collectionType',
  displayName: 'ol-category',
  singularName: 'ol-category',
  pluralName: 'ol-categories',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

const noteModel = {
  kind: 'collectionType',
  displayName: 'ol-note',
  singularName: 'ol-note',
  pluralName: 'ol-notes',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    rank: { type: 'integer' },
    cover: { type: 'media', multiple: false, allowedTypes: ['images'] },
    seo: { type: 'component', component: 'default.ol-seo', repeatable: false },
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
let categoryId: number;
let rq: (options: { method: string; url: string; qs?: Record<string, unknown> }) => Promise<{
  statusCode: number;
  body: { data?: Note[]; error?: Record<string, unknown> };
}>;

const findNotes = (filters: Record<string, unknown>) => {
  return strapi.documents(NOTE_UID).findMany({ filters } as any) as unknown as Promise<Note[]>;
};

const getNotes = (filters: Record<string, unknown>) => {
  return rq({ method: 'GET', url: '/ol-notes', qs: { filters } });
};

const titles = (notes: Note[] | undefined) => (notes ?? []).map((note) => note.title).sort();

describe('Filtering with object operands in lists and on relation, media and component attributes', () => {
  beforeAll(async () => {
    await builder.addComponent(seoComponent).addContentTypes([categoryModel, noteModel]).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    const category = await strapi.documents(CATEGORY_UID).create({ data: { name: 'Cat A' } });
    categoryId = category.id as number;

    await strapi.documents(NOTE_UID).create({
      data: {
        title: 'Note 1',
        rank: 1,
        seo: { metaTitle: 'Seo 1' },
        category: category.documentId,
      },
    });
    await strapi.documents(NOTE_UID).create({
      data: { title: 'Note 2', rank: 2, seo: { metaTitle: 'Seo 2' } },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  // Each of these filters has no matching row. Before the fix, each one returned both rows, except
  // the scalar $or list, which the database layer answered with a 500, and the $in lists on rank and
  // category, which Postgres answered with a 500.
  const rejectedFilters: Array<[string, Record<string, unknown>]> = [
    ['an object operand in a $not list', { title: { $not: [{ $eq: { a: 1 } }] } }],
    [
      'an object operand in a $not list of several',
      { rank: { $not: [{ $eq: 3 }, { $lt: { a: 1 } }] } },
    ],
    ['an object operand on a media attribute', { cover: { $eq: { a: 1 } } }],
    ['an object operand on a component attribute', { seo: { $eq: { a: 1 } } }],
    ['an object operand on a relation attribute', { category: { $eq: { a: 1 } } }],
    ['an object operand in a nested $not list', { category: { $not: [[{ $eq: { a: 1 } }]] } }],
    ['an object operand in an $eq list', { title: { $eq: [{ $eq: { a: 1 } }] } }],
    ['an object operand under a root $not', { $not: { $eq: { a: 1 } } }],
    ['an operator map in a $notIn list', { title: { $notIn: [{ $eq: 'Note 1' }] } }],
    ['an operator map in an $in list', { rank: { $in: [{ $eq: 1 }] } }],
    ['an object in an $in list on a relation', { category: { $in: [{ id: 1 }] } }],
    [
      'an object operand in an $or list',
      { title: { $or: [{ $eq: 'Note 1' }, { $eq: { a: 1 } }] } },
    ],
    [
      'an object operand in an $and list on a relation',
      { category: { $and: [{ $eq: { a: 1 } }] } },
    ],
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

    test('names the operator and attribute of an object operand in a list', async () => {
      const res = await getNotes({ title: { $not: [{ $eq: { a: 1 } }] } });

      expect(res.body.error).toMatchObject({
        message: 'Invalid operand for $eq at title: expected a value, not an object',
      });
    });
  });

  // Operator maps in lists, and relation, media and component filters keep working.
  const acceptedFilters = (): Array<[string, Record<string, unknown>, string[]]> => [
    ['a $not list of operator maps', { title: { $not: [{ $eq: 'Note 1' }] } }, ['Note 2']],
    ['a relation id operand', { category: { $eq: categoryId } }, ['Note 1']],
    ['a relation $null operand', { category: { $null: true } }, ['Note 2']],
    ['a nested relation filter', { category: { name: { $eq: 'Cat A' } } }, ['Note 1']],
    ['a media $null operand', { cover: { $null: true } }, ['Note 1', 'Note 2']],
    ['a nested component filter', { seo: { metaTitle: { $eq: 'Seo 2' } } }, ['Note 2']],
    [
      'a relation $or list',
      { category: { $or: [{ name: 'Cat B' }, { name: 'Cat A' }] } },
      ['Note 1'],
    ],
    // A row without a category has a null name, so neither $not form matches it
    ['a relation $not filter', { category: { $not: { name: 'Cat B' } } }, ['Note 1']],
    ['a root $not relation filter', { $not: { category: { name: 'Cat B' } } }, ['Note 1']],
  ];

  describe('legitimate operands', () => {
    test('Document Service and REST accept them', async () => {
      for (const [name, filters, expected] of acceptedFilters()) {
        expect([name, titles(await findNotes(filters))]).toEqual([name, expected]);

        const res = await getNotes(filters);

        expect([name, res.statusCode, titles(res.body.data)]).toEqual([name, 200, expected]);
      }
    });
  });
});

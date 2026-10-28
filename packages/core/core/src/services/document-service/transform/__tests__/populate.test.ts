import { traverse } from '@strapi/utils';

import { PRODUCT_UID, CATEGORY_UID, models } from './utils';

import { transformPopulate } from '../populate';

const findProducts = jest.fn(() => ({}));
const findCategories = jest.fn(() => ({}));

const findManyQueries = {
  [PRODUCT_UID]: findProducts,
  [CATEGORY_UID]: findCategories,
} as Record<string, jest.Mock>;

describe('transformPopulate', () => {
  beforeAll(() => {
    global.strapi = {
      getModel: (uid: string) => models[uid],
      db: {
        query: jest.fn((uid) => ({ findMany: findManyQueries[uid] })),
        metadata: {
          get: jest.fn(() => ({
            columnToAttribute: [],
          })),
        },
      },
    } as any;
  });

  // TODO: Are these all realistic formats for populate?
  it('should not modify simple populate', async () => {
    const input = { id: 'someValue' };
    const expected = { id: 'someValue' };

    expect(await transformPopulate(input, { uid: CATEGORY_UID })).toEqual(expected);
  });

  it('should handle empty objects', async () => {
    const input = {};
    const expected = {};

    expect(await transformPopulate(input, { uid: PRODUCT_UID })).toEqual(expected);
  });

  it('should ignore non relational nested values', async () => {
    const input = { _tmp: { id: 'nestedValue' } };

    expect(await transformPopulate(input, { uid: PRODUCT_UID })).toEqual(input);
  });

  it('should ignore non relational nested filters', async () => {
    const input = { _tmp: { filters: { id: 'nestedValue', something: 'else' } } };

    expect(await transformPopulate(input, { uid: PRODUCT_UID })).toEqual(input);
  });

  it('should handle arrays in relational fields', async () => {
    const input = { categories: { fields: ['this', 'that'] } };
    const expected = { categories: { fields: ['this', 'that', 'documentId'] } };

    expect(await transformPopulate(input, { uid: PRODUCT_UID })).toEqual(expected);
  });

  it('should not mutate the given populate', async () => {
    const input = {
      categories: {
        fields: ['name'],
        populate: { relatedCategories: { fields: ['name'] } },
      },
    };
    const before = structuredClone(input);

    expect(await transformPopulate(input, { uid: PRODUCT_UID })).toEqual({
      categories: {
        fields: ['name', 'documentId'],
        populate: { relatedCategories: { fields: ['name', 'documentId'] } },
      },
    });
    expect(input).toEqual(before);
  });

  it('should set a new value instead of writing into the one it visits', async () => {
    // The traversal deep-clones its input today, so a visitor writing into `value` would
    // not reach the caller. Check the visitor itself so that guarantee is not load bearing.
    const traverseQueryPopulate = jest.spyOn(traverse, 'traverseQueryPopulate');
    await transformPopulate({}, { uid: PRODUCT_UID });
    const visitor = traverseQueryPopulate.mock.calls[0][0];
    traverseQueryPopulate.mockRestore();

    const fields = Object.freeze(['name']);
    const value = Object.freeze({ fields, filters: { name: 'a' } });
    const set = jest.fn();

    await visitor(
      { key: 'categories', value, attribute: models[PRODUCT_UID].attributes.categories } as any,
      { set, remove: jest.fn() }
    );

    expect(set).toHaveBeenCalledWith('categories', {
      fields: ['name', 'documentId'],
      filters: { name: 'a' },
    });
    expect(value.fields).toBe(fields);
    expect(fields).toEqual(['name']);
  });
});

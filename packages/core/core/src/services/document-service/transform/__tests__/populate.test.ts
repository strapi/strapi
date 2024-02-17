import { LoadedStrapi } from '@strapi/types';
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
    } as unknown as LoadedStrapi;
  });

  // TODO: Are these all realistic formats for populate?
  it('should transform simple populate', async () => {
    const input = { id: 'someValue' };
    const expected = { documentId: 'someValue' };

    expect(
      await transformPopulate(input, {
        uid: CATEGORY_UID,
      })
    ).toEqual(expected);
  });

  it('should not modify other fields', async () => {
    const input = { otherField: 'value', id: 'test' };
    const expected = { otherField: 'value', documentId: 'test' };

    expect(await transformPopulate(input, { uid: PRODUCT_UID })).toEqual(expected);
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

  it('should handle nested relational filters', async () => {
    const input = { category: { filters: { id: 'nestedValue', something: 'else' } } };
    const expected = { category: { filters: { documentId: 'nestedValue', something: 'else' } } };

    expect(await transformPopulate(input, { uid: PRODUCT_UID })).toEqual(expected);
  });

  it('should ignore non relational nested fields', async () => {
    const input = { _tmp: { fields: ['id', 'this', 'that'] } };

    expect(await transformPopulate(input, { uid: PRODUCT_UID })).toEqual(input);
  });

  it('should handle arrays in relational fields', async () => {
    const input = { categories: { fields: ['id', 'this', 'that'] } };
    const expected = { categories: { fields: ['documentId', 'this', 'that'] } };

    expect(await transformPopulate(input, { uid: PRODUCT_UID })).toEqual(expected);
  });

  it('should handle complex nested field/filter structures, ignoring nested non relational keys', async () => {
    const input = {
      relatedProducts: {
        fields: ['this', 'that', 'id', 'name', 'etc'],
        filters: { id: 'productId', something: 'else' },
        categories: {
          fields: ['this', 'that', 'id', 'name', 'etc'],
          filters: { id: 'categoryId', something: 'else' },
        },
        _tmp: {
          fields: ['this', 'that', 'id', 'name', 'etc'],
          filters: { id: 'nestedValue', something: 'else' },
        },
      },
    };
    const expected = {
      relatedProducts: {
        fields: ['this', 'that', 'documentId', 'name', 'etc'],
        filters: { documentId: 'productId', something: 'else' },
        categories: {
          fields: ['this', 'that', 'documentId', 'name', 'etc'],
          filters: { documentId: 'categoryId', something: 'else' },
        },
        _tmp: {
          fields: ['this', 'that', 'id', 'name', 'etc'],
          filters: { id: 'nestedValue', something: 'else' },
        },
      },
    };

    expect(await transformPopulate(input, { uid: PRODUCT_UID })).toEqual(expected);
  });
});

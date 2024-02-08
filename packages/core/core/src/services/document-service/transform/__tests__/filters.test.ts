import { LoadedStrapi } from '@strapi/types';
import { PRODUCT_UID, CATEGORY_UID, models } from './utils';

import { transformFilters } from '../filters';

const findProducts = jest.fn(() => ({}));
const findCategories = jest.fn(() => ({}));

const findManyQueries = {
  [PRODUCT_UID]: findProducts,
  [CATEGORY_UID]: findCategories,
} as Record<string, jest.Mock>;

describe('transformFilters', () => {
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

  it('should transform simple filters', async () => {
    const input = { id: 'someValue' };
    const expected = { documentId: 'someValue' };

    expect(
      await transformFilters(input, {
        uid: CATEGORY_UID,
        isDraft: false,
      })
    ).toEqual(expected);
  });

  it('should handle empty objects', async () => {
    const input = {};
    const expected = {};

    expect(await transformFilters(input, { uid: PRODUCT_UID, isDraft: false })).toStrictEqual(
      expected
    );
  });

  it('should not modify other fields that are in the model schema', async () => {
    const input = { name: 'value', id: 'test' };
    const expected = { name: 'value', documentId: 'test' };

    expect(await transformFilters(input, { uid: PRODUCT_UID, isDraft: false })).toStrictEqual(
      expected
    );
  });

  it('should not modify other fields not in the model schema', async () => {
    const input = { otherField: 'value', id: 'test' };
    const expected = { otherField: 'value', documentId: 'test' };

    expect(await transformFilters(input, { uid: PRODUCT_UID, isDraft: false })).toStrictEqual(
      expected
    );
  });

  it('should ignore non relational nested filters', async () => {
    const input = { _tmp: { id: 'nestedValue' } };

    expect(await transformFilters(input, { uid: PRODUCT_UID, isDraft: false })).toStrictEqual(
      input
    );
  });

  it('should ignore non relational nested array filters', async () => {
    const input = { _tmp: [{ id: 'arrayValue1' }, { id: 'arrayValue2' }] };

    expect(await transformFilters(input, { uid: PRODUCT_UID, isDraft: false })).toStrictEqual(
      input
    );
  });

  it('should handle nested relational filters', async () => {
    const input = { category: { id: 'nestedValue' } };
    const expected = { category: { documentId: 'nestedValue', publishedAt: { $ne: null } } };

    expect(await transformFilters(input, { uid: PRODUCT_UID, isDraft: false })).toStrictEqual(
      expected
    );
  });

  it('should handle arrays in relational filters', async () => {
    const input = {
      categories: [{ id: 'arrayValue1' }, { id: 'arrayValue2' }, { id: { $eq: 'arrayValue3' } }],
    };
    const expected = {
      categories: [
        { documentId: 'arrayValue1', locale: 'en', publishedAt: { $ne: null } },
        { documentId: 'arrayValue2', locale: 'en', publishedAt: { $ne: null } },
        { documentId: { $eq: 'arrayValue3' }, locale: 'en', publishedAt: { $ne: null } },
      ],
    };

    expect(
      await transformFilters(input, { uid: PRODUCT_UID, locale: 'en', isDraft: false })
    ).toStrictEqual(expected);
  });

  it('should handle complex nested structures, ignoring nested non relational keys', async () => {
    const input = {
      relatedProducts: {
        categories: [
          { id: 'complex1' },
          { someKey: { id: 'complex2' } },
          { documentId: 'complex3' },
        ],
      },
    };
    const expected = {
      relatedProducts: {
        categories: [
          { documentId: 'complex1', publishedAt: { $ne: null } },
          { someKey: { id: 'complex2' } },
          { documentId: 'complex3' },
        ],
      },
    };

    expect(await transformFilters(input, { uid: PRODUCT_UID, isDraft: false })).toStrictEqual(
      expected
    );
  });

  it('should handle filters objects', async () => {
    const inputs = [
      {
        input: { id: 'documentId' },
        expected: { documentId: 'documentId' },
      },
      {
        input: { id: { $eq: 'documentId' } },
        expected: { documentId: { $eq: 'documentId' } },
      },
      {
        input: { id: { $in: ['documentId'] } },
        expected: { documentId: { $in: ['documentId'] } },
      },
      {
        input: { category: { id: 'documentId' } },
        expected: { category: { documentId: 'documentId', publishedAt: null } },
      },
    ];

    inputs.forEach(async ({ input, expected }) => {
      expect(await transformFilters(input, { uid: PRODUCT_UID, isDraft: true })).toStrictEqual(
        expected
      );
    });
  });
});

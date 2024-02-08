import { LoadedStrapi } from '@strapi/types';
import { transformSort } from '../sort';
import { CATEGORY_UID, PRODUCT_UID, models } from './utils';

const findProducts = jest.fn(() => ({}));
const findCategories = jest.fn(() => ({}));

const findManyQueries = {
  [PRODUCT_UID]: findProducts,
  [CATEGORY_UID]: findCategories,
} as Record<string, jest.Mock>;

describe('transformSort', () => {
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

  it('should transform a single input', async () => {
    const input = 'id';
    const expected = 'documentId';

    expect(await transformSort(input, { uid: CATEGORY_UID, isDraft: false })).toEqual(expected);
  });

  it('should handle non-array inputs', async () => {
    const input = 'createdAt';
    expect(await transformSort(input, { uid: CATEGORY_UID, isDraft: false })).toEqual(input);
  });

  it('should transform a single input', async () => {
    const input = ['id'];
    const expected = ['documentId'];
    expect(await transformSort(input, { uid: CATEGORY_UID, isDraft: false })).toEqual(expected);
  });

  it('should transform an array of inputs', async () => {
    const input = ['id', 'name'];
    const expected = ['documentId', 'name'];
    expect(await transformSort(input, { uid: PRODUCT_UID, isDraft: false })).toEqual(expected);
  });

  it('should transform arrays of complex sorts', async () => {
    const input = [
      // TODO handle object sorts
      // { name: 'asc', category: { id: 'asc' } },
      'id',
      'name,id:DESC',
      'category.id:ASC',
      'relatedProducts.categories.id',
      'categories.id',
      'nothing.id',
    ];
    const expected = [
      'documentId',
      'name,documentId:DESC',
      'category.documentId:ASC',
      'relatedProducts.categories.documentId',
      'categories.documentId',
      'nothing.id',
    ];

    expect(await transformSort(input, { uid: PRODUCT_UID, isDraft: false })).toEqual(expected);
  });

  it('should handle empty array', async () => {
    const input: string[] = [];
    expect(await transformSort(input, { uid: CATEGORY_UID, isDraft: false })).toEqual(input);
  });
});

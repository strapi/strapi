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
});

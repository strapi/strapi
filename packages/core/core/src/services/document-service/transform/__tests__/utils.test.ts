import { LoadedStrapi } from '@strapi/types';
import { PRODUCT_UID, CATEGORY_UID, models } from './utils';

import { createIdMap } from '../id-map';
import { transformFiltersOrPopulate, transformFieldsOrSort } from '../utils';

const findProducts = jest.fn(() => ({}));
const findCategories = jest.fn(() => ({}));

const findManyQueries = {
  [PRODUCT_UID]: findProducts,
  [CATEGORY_UID]: findCategories,
} as Record<string, jest.Mock>;

describe('Transformation utils', () => {
  describe('transformFiltersOrPopulate', () => {
    global.strapi = {
      getModel: (uid: string) => models[uid],
      db: {
        query: jest.fn((uid) => ({ findMany: findManyQueries[uid] })),
      },
    } as unknown as LoadedStrapi;

    const idMap = createIdMap({ strapi: global.strapi });

    it('should transform simple filters', () => {
      const input = { id: 'someValue' };
      const expected = { documentId: 'someValue' };

      expect(
        transformFiltersOrPopulate(idMap, input, { uid: CATEGORY_UID, isDraft: true })
      ).toEqual(expected);
    });

    it('should not modify other fields', () => {
      const input = { otherField: 'value', id: 'test' };
      const expected = { otherField: 'value', documentId: 'test' };

      expect(transformFiltersOrPopulate(idMap, input, { uid: PRODUCT_UID, isDraft: true })).toEqual(
        expected
      );
    });

    it('should handle empty objects', () => {
      const input = {};
      const expected = {};

      expect(transformFiltersOrPopulate(idMap, input, { uid: PRODUCT_UID, isDraft: true })).toEqual(
        expected
      );
    });

    it('should handle nested relational filters', () => {
      const input = { category: { id: 'nestedValue' } };
      const expected = { category: { documentId: 'nestedValue' } };

      expect(transformFiltersOrPopulate(idMap, input, { uid: PRODUCT_UID, isDraft: true })).toEqual(
        expected
      );
    });

    it('should ignore non relational nested filters', () => {
      const input = { _tmp: { id: 'nestedValue' } };

      expect(transformFiltersOrPopulate(idMap, input, { uid: PRODUCT_UID, isDraft: true })).toEqual(
        input
      );
    });

    it('should handle arrays in relational filters', () => {
      const input = { categories: [{ id: 'arrayValue1' }, { id: 'arrayValue2' }] };
      const expected = {
        categories: [{ documentId: 'arrayValue1' }, { documentId: 'arrayValue2' }],
      };

      expect(transformFiltersOrPopulate(idMap, input, { uid: PRODUCT_UID, isDraft: true })).toEqual(
        expected
      );
    });

    it('should ignore non relational nested array filters', () => {
      const input = { _tmp: [{ id: 'arrayValue1' }, { id: 'arrayValue2' }] };

      expect(transformFiltersOrPopulate(idMap, input, { uid: PRODUCT_UID, isDraft: true })).toEqual(
        input
      );
    });

    it('should handle complex nested structures, ignoring nested non relational keys', () => {
      const input = {
        relatedProducts: {
          categories: [{ id: 'complex1' }, { someKey: { id: 'complex2' } }],
        },
      };
      const expected = {
        relatedProducts: {
          categories: [{ documentId: 'complex1' }, { someKey: { id: 'complex2' } }],
        },
      };

      expect(transformFiltersOrPopulate(idMap, input, { uid: PRODUCT_UID, isDraft: true })).toEqual(
        expected
      );
    });

    it('should handle filters objects', () => {
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
          expected: { category: { documentId: 'documentId' } },
        },
      ];

      inputs.forEach(({ input, expected }) => {
        expect(
          transformFiltersOrPopulate(idMap, input, { uid: PRODUCT_UID, isDraft: true })
        ).toEqual(expected);
      });
    });

    it('should handle populate objects', () => {
      const inputs = [
        {
          input: { category: { fields: ['id'] } },
          expected: { category: { fields: ['documentId'] } },
        },
        {
          input: { category: { filters: { id: 'documentId' } } },
          expected: { category: { filters: { documentId: 'documentId' } } },
        },
      ];

      inputs.forEach(({ input, expected }) => {
        expect(
          transformFiltersOrPopulate(idMap, input, { uid: PRODUCT_UID, isDraft: true })
        ).toEqual(expected);
      });
    });
  });

  describe('transformFieldsOrSort', () => {
    it('should transform a single input', () => {
      const input = 'id';
      const expected = 'documentId';
      expect(transformFieldsOrSort(input)).toEqual(expected);
    });

    it('should handle non-array inputs', () => {
      const input = 'createdAt';
      const expected = 'createdAt';
      expect(transformFieldsOrSort(input)).toEqual(expected);
    });

    it('should transform a single input', () => {
      const input = ['id'];
      const expected = ['documentId'];
      expect(transformFieldsOrSort(input)).toEqual(expected);
    });

    it('should transform an array of inputs', () => {
      const input = ['id', 'name'];
      const expected = ['documentId', 'name'];
      expect(transformFieldsOrSort(input)).toEqual(expected);
    });

    it('should transform multiple inputs', () => {
      // TODO what if a key is repeated?
      // Do we handle this?
      const input = ['id', 'name', 'id'];
      const expected = ['documentId', 'name', 'documentId'];
      expect(transformFieldsOrSort(input)).toEqual(expected);
    });

    it('should not modify other inputs', () => {
      const input = ['name', 'description'];
      const expected = ['name', 'description'];
      expect(transformFieldsOrSort(input)).toEqual(expected);
    });

    it('should handle empty array', () => {
      const input: string[] = [];
      const expected: string[] = [];
      expect(transformFieldsOrSort(input)).toEqual(expected);
    });
  });
});

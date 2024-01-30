import { transformFiltersOrPopulate, transformFields, transformSort } from '../utils';

describe('Transformation utils', () => {
  describe('transformFiltersOrPopulate', () => {
    it('should transform simple filters', () => {
      const input = { id: 'someValue' };
      const expected = { documentId: 'someValue' };

      expect(transformFiltersOrPopulate(input)).toEqual(expected);
    });

    it('should handle nested filters', () => {
      const input = { someField: { id: 'nestedValue' } };
      const expected = { someField: { documentId: 'nestedValue' } };

      expect(transformFiltersOrPopulate(input)).toEqual(expected);
    });

    it('should handle arrays in filters', () => {
      const input = { someArray: [{ id: 'arrayValue1' }, { id: 'arrayValue2' }] };
      const expected = {
        someArray: [{ documentId: 'arrayValue1' }, { documentId: 'arrayValue2' }],
      };

      expect(transformFiltersOrPopulate(input)).toEqual(expected);
    });

    it('should handle complex nested structures', () => {
      const input = {
        outerField: {
          innerField: [{ id: 'complex1' }, { someKey: { id: 'complex2' } }],
        },
      };
      const expected = {
        outerField: {
          innerField: [{ documentId: 'complex1' }, { someKey: { documentId: 'complex2' } }],
        },
      };

      expect(transformFiltersOrPopulate(input)).toEqual(expected);
    });

    it('should not modify other fields', () => {
      const input = { otherField: 'value', id: 'test' };
      const expected = { otherField: 'value', documentId: 'test' };

      expect(transformFiltersOrPopulate(input)).toEqual(expected);
    });

    it('should handle empty objects', () => {
      const input = {};
      const expected = {};

      expect(transformFiltersOrPopulate(input)).toEqual(expected);
    });

    it('should handle filters objects', () => {
      const inputs = [
        {
          input: { filters: { id: 'documentId' } },
          expected: { filters: { documentId: 'documentId' } },
        },
        {
          input: { filters: { id: { $eq: 'documentId' } } },
          expected: { filters: { documentId: { $eq: 'documentId' } } },
        },
        {
          input: { filters: { id: { $in: ['documentId'] } } },
          expected: { filters: { documentId: { $in: ['documentId'] } } },
        },
        {
          input: { filters: { category: { id: 'documentId' } } },
          expected: { filters: { category: { documentId: 'documentId' } } },
        },
      ];

      inputs.forEach(({ input, expected }) => {
        expect(transformFiltersOrPopulate(input)).toEqual(expected);
      });
    });

    it('should handle populate objects', () => {
      const inputs = [
        {
          input: { populate: { category: { fields: ['id'] } } },
          expected: { populate: { category: { fields: ['documentId'] } } },
        },
        {
          input: { populate: { category: { filters: { id: 'documentId' } } } },
          expected: { populate: { category: { filters: { documentId: 'documentId' } } } },
        },
      ];

      inputs.forEach(({ input, expected }) => {
        expect(transformFiltersOrPopulate(input)).toEqual(expected);
      });
    });
  });

  describe('transformFields', () => {
    it('should transform a single field', () => {
      const fields = ['id'];
      const expected = ['documentId'];
      expect(transformFields(fields)).toEqual(expected);
    });

    it('should transform multiple fields', () => {
      const fields = ['id', 'name', 'id'];
      const expected = ['documentId', 'name', 'documentId'];
      expect(transformFields(fields)).toEqual(expected);
    });

    it('should not modify other fields', () => {
      const fields = ['name', 'description'];
      const expected = ['name', 'description'];
      expect(transformFields(fields)).toEqual(expected);
    });

    it('should handle empty fields array', () => {
      const fields: string[] = [];
      const expected: string[] = [];
      expect(transformFields(fields)).toEqual(expected);
    });
  });

  describe('transformSort', () => {
    it('should transform a single sort field', () => {
      const sort = 'id';
      const expected = 'documentId';
      expect(transformSort(sort)).toEqual(expected);
    });

    it('should transform an array of sort fields', () => {
      // TODO what if a key is repeated?
      //   const sort = ['id', 'name', 'id'];
      const sort = ['id', 'name'];
      const expected = ['documentId', 'name'];
      expect(transformSort(sort)).toEqual(expected);
    });

    it('should not modify other sort fields', () => {
      const sort = ['name', 'createdAt'];
      const expected = ['name', 'createdAt'];
      expect(transformSort(sort)).toEqual(expected);
    });

    it('should handle empty sort array', () => {
      const sort: string[] = [];
      const expected: string[] = [];
      expect(transformSort(sort)).toEqual(expected);
    });

    it('should handle non-array sort fields', () => {
      const sort = 'createdAt';
      const expected = 'createdAt';
      expect(transformSort(sort)).toEqual(expected);
    });
  });
});

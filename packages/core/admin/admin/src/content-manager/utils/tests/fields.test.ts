import { getFieldName, getMaxTempKey } from '../fields';

describe('fields', () => {
  describe('getFieldName', () => {
    it('should return an array with path of the field name', () => {
      expect(getFieldName('test')).toEqual(['test']);

      // Component single
      expect(getFieldName('test.name')).toEqual(['test', 'name']);

      // Component repeatable or DZ
      expect(getFieldName('test.0.name')).toEqual(['test', 'name']);

      // Crash test
      expect(getFieldName('test.0.name.0.sub.1.subsub')).toEqual(['test', 'name', 'sub', 'subsub']);
    });
  });

  describe('getMaxTempKey', () => {
    it('should return -1 is the array is empty', () => {
      expect(getMaxTempKey([])).toEqual(-1);
    });

    it('should return the max of the array', () => {
      const data = [{ __temp_key__: 110 }, { __temp_key__: 111 }, { __temp_key__: 0 }];

      expect(getMaxTempKey(data)).toEqual(111);
    });
  });
});

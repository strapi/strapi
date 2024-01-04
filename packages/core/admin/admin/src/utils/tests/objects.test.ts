import { isObject } from '../objects';

describe('objects', () => {
  describe('isObject', () => {
    it('should return true if the given value is an object', () => {
      expect(isObject({})).toBeTruthy();
    });
    it('should return false is the given value is not an object', () => {
      expect(isObject(1)).toBeFalsy();
      expect(isObject('')).toBeFalsy();
      expect(isObject([])).toBeFalsy();
      expect(isObject(null)).toBeFalsy();
      expect(isObject(undefined)).toBeFalsy();
    });
  });
});

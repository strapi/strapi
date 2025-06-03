import { capitalise } from '../strings';

describe('strings', () => {
  describe('capitalise', () => {
    it('should capitalise the first letter of the given string', () => {
      expect(capitalise('hello')).toBe('Hello');
      expect(capitalise('hello there')).toBe('Hello there');
    });
  });
});

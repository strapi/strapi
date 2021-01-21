import generateStartFromPage from '../generateStartFromPage';

describe('MEDIA LIBRARY | containers | HomePage | utils', () => {
  describe('generateStartFromPage', () => {
    it('should return 0 if page is 1 and limit is 10', () => {
      const page = 1;
      const limit = 10;
      const expected = 0;

      expect(generateStartFromPage(page, limit)).toEqual(expected);
    });

    it('should return 10 if page is 2 and limit is 10', () => {
      const page = 2;
      const limit = 10;
      const expected = 10;

      expect(generateStartFromPage(page, limit)).toEqual(expected);
    });

    it('should return 20 if page is 3 and limit is 10', () => {
      const page = 3;
      const limit = 10;
      const expected = 20;

      expect(generateStartFromPage(page, limit)).toEqual(expected);
    });

    it('should return 20 if page is 2 and limit is 20', () => {
      const page = 2;
      const limit = 20;
      const expected = 20;

      expect(generateStartFromPage(page, limit)).toEqual(expected);
    });

    it('should return 40 if page is 3 and limit is 20', () => {
      const page = 3;
      const limit = 20;
      const expected = 40;

      expect(generateStartFromPage(page, limit)).toEqual(expected);
    });
  });
});

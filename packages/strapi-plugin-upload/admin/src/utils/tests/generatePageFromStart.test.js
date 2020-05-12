import generatePageFromStart from '../generatePageFromStart';

describe('MEDIA LIBRARY | containers | HomePage | utils', () => {
  describe('generatePageFromStart', () => {
    it('should return 1 if start is 0 and limit is 10', () => {
      const start = 0;
      const limit = 10;
      const expected = 1;

      expect(generatePageFromStart(start, limit)).toEqual(expected);
    });

    it('should return 2 if start is 10 and limit is 10', () => {
      const start = 10;
      const limit = 10;
      const expected = 2;

      expect(generatePageFromStart(start, limit)).toEqual(expected);
    });

    it('should return 3 if start is 20 and limit is 10', () => {
      const start = 20;
      const limit = 10;
      const expected = 3;

      expect(generatePageFromStart(start, limit)).toEqual(expected);
    });

    it('should return 1 if start is 10 and limit is 20', () => {
      const start = 10;
      const limit = 20;
      const expected = 1;

      expect(generatePageFromStart(start, limit)).toEqual(expected);
    });

    it('should return  if start is 20 and limit is 20', () => {
      const start = 20;
      const limit = 20;
      const expected = 2;

      expect(generatePageFromStart(start, limit)).toEqual(expected);
    });

    it('should return  if start is 50 and limit is 20', () => {
      const start = 50;
      const limit = 20;
      const expected = 3;

      expect(generatePageFromStart(start, limit)).toEqual(expected);
    });

    it('should return  if start is 70 and limit is 20', () => {
      const start = 70;
      const limit = 20;
      const expected = 4;

      expect(generatePageFromStart(start, limit)).toEqual(expected);
    });
  });
});

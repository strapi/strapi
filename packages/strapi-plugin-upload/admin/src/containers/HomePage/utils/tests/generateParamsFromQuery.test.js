import generateParamsFromQuery from '../generateParamsFromQuery';

describe('MEDIA LIBRARY | containers | HomePage | utils', () => {
  describe('generateParamsFromQuery', () => {
    it('should return the initial object if search is empty', () => {
      const search = '';
      const query = new URLSearchParams(search);

      const expected = {
        _limit: 10,
        _start: 0,
      };

      expect(generateParamsFromQuery(query)).toEqual(expected);
    });

    it('should return an object with right params', () => {
      const search = '_limit=20&_start=10&mime_contains=image';
      const query = new URLSearchParams(search);

      const expected = {
        _limit: '20',
        _start: '10',
        mime_contains: 'image',
      };

      expect(generateParamsFromQuery(query)).toEqual(expected);
    });
  });
});

import generateStringFromParams from '../generateStringFromParams';

describe('MEDIA LIBRARY | containers | HomePage | utils', () => {
  describe('generateStringFromParams', () => {
    it('should return a string with params', () => {
      const initialParams = {
        _q: 'hello',
        _limit: 10,
        _start: 0,
        filters: [],
      };

      const expected = '_q=hello&_limit=10&_start=0';

      expect(generateStringFromParams(initialParams)).toEqual(expected);
    });

    it('should return a string with regular filters', () => {
      const initialParams = {
        _q: 'hello',
        _limit: 10,
        _start: 0,
        filters: [
          {
            name: 'mime',
            filter: '_contains',
            value: 'image',
          },
        ],
      };

      const expected = '_q=hello&_limit=10&_start=0&mime_contains=image';

      expect(generateStringFromParams(initialParams)).toEqual(expected);
    });

    it('should return a string with converted filters if filter is _contains', () => {
      const initialParams = {
        _q: 'hello',
        _limit: 10,
        _start: 0,
        filters: [
          {
            name: 'mime',
            filter: '_contains',
            value: 'file',
          },
        ],
      };

      const expected = '_q=hello&_limit=10&_start=0&mime_ncontains=image&mime_ncontains=video';

      expect(generateStringFromParams(initialParams)).toEqual(expected);
    });

    it('should return a string with converted filters if filter is _ncontains', () => {
      const initialParams = {
        _q: 'hello',
        _limit: 10,
        _start: 0,
        filters: [
          {
            name: 'mime',
            filter: '_ncontains',
            value: 'file',
          },
        ],
      };

      const expected = '_q=hello&_limit=10&_start=0&mime_contains=image&mime_contains=video';

      expect(generateStringFromParams(initialParams)).toEqual(expected);
    });
  });
});

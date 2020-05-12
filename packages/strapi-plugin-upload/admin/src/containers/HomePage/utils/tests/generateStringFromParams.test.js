import generateStringFromParams from '../generateStringFromParams';

describe('MEDIA LIBRARY | containers | HomePage | utils', () => {
  describe('generateStringFromParams', () => {
    it('should return a string with query params if query is empty', () => {
      const search = '';
      const query = new URLSearchParams(search);

      const expected = '_limit=10&_start=0';

      expect(generateStringFromParams(query)).toEqual(expected);
    });

    it('should return a string with query params if search is not empty', () => {
      const search = '_limit=20&_start=0&mime_contains=image';
      const query = new URLSearchParams(search);

      const expected = '_limit=20&_start=0&mime_contains=image';

      expect(generateStringFromParams(query)).toEqual(expected);
    });

    describe('return a string with converted filters if value is file', () => {
      it('should return _ncontains instead of _contains', () => {
        const search = '?mime_ncontains=file';
        const query = new URLSearchParams(search);

        const expected = '_limit=10&_start=0&mime_contains=image&mime_contains=video';

        expect(generateStringFromParams(query)).toEqual(expected);
      });

      it('should return _contains instead of _ncontains', () => {
        const search = '?_limit=20&_start=0&mime_contains=file';
        const query = new URLSearchParams(search);

        const expected = '_limit=20&_start=0&mime_ncontains=image&mime_ncontains=video';

        expect(generateStringFromParams(query)).toEqual(expected);
      });
    });

    describe('it should filter the defined params', () => {
      it('should return _ncontains instead of _contains', () => {
        const search = '?mime_ncontains=file&test=true';
        const query = new URLSearchParams(search);

        const expected = '_limit=10&_start=0&mime_contains=image&mime_contains=video&test=true';

        expect(generateStringFromParams(query, [])).toEqual(expected);
      });

      it('should not return the _limit param', () => {
        const search = '?mime_ncontains=file';
        const query = new URLSearchParams(search);

        const expected = '_start=0&mime_contains=image&mime_contains=video';

        expect(generateStringFromParams(query, ['_limit'])).toEqual(expected);
      });
    });
  });
});

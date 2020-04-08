import generateSearchFromObject from '../generateSearchFromObject';

describe('CONTENT MANAGER | containers | ListView | utils', () => {
  describe('generateSearchFromObject', () => {
    it('should return a string containing the _limit, _start and order', () => {
      const search = { _page: 1, _limit: 10, _sort: 'city:ASC' };
      const expected = '_limit=10&_sort=city:ASC&_start=0';

      expect(generateSearchFromObject(search)).toEqual(expected);
    });

    it('should remove the _q param from the search if it is empty', () => {
      const search = { _page: 1, _limit: 10, _sort: 'city:ASC', _q: '' };
      const expected = '_limit=10&_sort=city:ASC&_start=0';

      expect(generateSearchFromObject(search)).toEqual(expected);
    });

    it('should not add the filters if it is empty', () => {
      const search = {
        _page: 1,
        _limit: 10,
        _sort: 'city:ASC',
        _q: '',
        filters: [],
      };
      const expected = '_limit=10&_sort=city:ASC&_start=0';

      expect(generateSearchFromObject(search)).toEqual(expected);
    });

    it('should handle the filters correctly', () => {
      const search = {
        _limit: 10,
        _page: 1,
        _q: '',
        _sort: 'city:ASC',
        filters: [{ name: 'city', filter: '=', value: 'test' }],
      };

      const expected = '_limit=10&_sort=city:ASC&city=test&_start=0';

      expect(generateSearchFromObject(search)).toEqual(expected);
    });
  });
});

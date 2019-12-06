import {
  generateFiltersFromSearch,
  generateSearchFromFilters,
} from '../search';

describe('Content Manager | utils | search', () => {
  describe('generateFiltersFromSearch', () => {
    it('should generate an array of filters', () => {
      const search =
        '?_sort=id:ASC&bool=true&big_number_ne=1&created_at_lt=2019-08-01T00:00:00Z&date_lte=2019-08-02T00:00:00Z&decimal_number_gt=2&enum_ne=noon&float_number_gte=3';
      const expected = [
        {
          name: 'bool',
          filter: '=',
          value: 'true',
        },
        {
          name: 'big_number',
          filter: '_ne',
          value: '1',
        },
        {
          name: 'created_at',
          filter: '_lt',
          value: '2019-08-01T00:00:00Z',
        },
        {
          name: 'date',
          filter: '_lte',
          value: '2019-08-02T00:00:00Z',
        },
        {
          name: 'decimal_number',
          filter: '_gt',
          value: '2',
        },
        {
          name: 'enum',
          filter: '_ne',
          value: 'noon',
        },
        {
          name: 'float_number',
          filter: '_gte',
          value: '3',
        },
      ];

      expect(generateFiltersFromSearch(search)).toEqual(expected);
    });
  });

  describe('generateSearchFromFilters', () => {
    it('should return a string with all the applied filters', () => {
      const data = {
        _limit: 10,
        _sort: 'id:ASC',
        _page: 2,
        filters: [
          {
            name: 'bool',
            filter: '=',
            value: 'true',
          },
          {
            name: 'big_number',
            filter: '_ne',
            value: '1',
          },
          {
            name: 'created_at',
            filter: '_lt',
            value: '2019-08-01T00:00:00Z',
          },
          {
            name: 'date',
            filter: '_lte',
            value: '2019-08-02T00:00:00Z',
          },
          {
            name: 'decimal_number',
            filter: '_gt',
            value: '2',
          },
          {
            name: 'enum',
            filter: '_ne',
            value: 'noon',
          },
          {
            name: 'float_number',
            filter: '_gte',
            value: '3',
          },
        ],
      };
      const expected =
        '_limit=10&_sort=id:ASC&_page=2&bool=true&big_number_ne=1&created_at_lt=2019-08-01T00:00:00Z&date_lte=2019-08-02T00:00:00Z&decimal_number_gt=2&enum_ne=noon&float_number_gte=3';
      expect(generateSearchFromFilters(data)).toEqual(expected);
    });
  });
});

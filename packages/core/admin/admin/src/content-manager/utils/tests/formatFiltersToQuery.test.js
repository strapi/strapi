import formatFiltersToQuery from '../formatFiltersToQuery';

describe('CONTENT MANAGER | utils', () => {
  describe('formatFiltersToQuery', () => {
    it('should return the filters query', () => {
      const metadatas = {
        categories: {
          list: {
            mainField: { name: 'name' },
          },
        },
        like: {
          list: {
            mainField: { name: 'numbers' },
          },
        },
      };
      const data = [
        { name: 'city_ne', filter: '_ne', value: 'paris' },
        { name: 'city', filter: '_ne', value: 'paris' },
        { name: 'city', filter: '=', value: 'paris' },
        {
          name: 'categories',
          filter: '_ne',
          value: 'first',
        },
        {
          name: 'like',
          filter: '_lt',
          value: 34,
        },
      ];

      const expected = {
        _where: [
          {
            city_ne_ne: 'paris',
          },
          {
            city_ne: 'paris',
          },
          {
            city: 'paris',
          },
          {
            'categories.name_ne': 'first',
          },
          {
            'like.numbers_lt': 34,
          },
        ],
      };

      expect(formatFiltersToQuery(data, metadatas)).toEqual(expected);
    });
  });
});

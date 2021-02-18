import generateFiltersFromSearch from '../generateFiltersFromSearch';

describe('HELPER PLUGIN | utils | generateFiltersFromSearch', () => {
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

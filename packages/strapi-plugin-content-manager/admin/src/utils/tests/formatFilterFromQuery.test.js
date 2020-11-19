import formatFiltersFromQuery, { findAppliedFilter } from '../formatFiltersFromQuery';

describe('CONTENT MANAGER | utils', () => {
  describe('findAppliedFilter', () => {
    it('should return the correct filter', () => {
      expect(findAppliedFilter('city')).toEqual({ operator: '=', field: 'city' });
      expect(findAppliedFilter('city_nee')).toEqual({ operator: '=', field: 'city_nee' });
      expect(findAppliedFilter('city_ne')).toEqual({ operator: '_ne', field: 'city' });
      expect(findAppliedFilter('city_lt')).toEqual({ operator: '_lt', field: 'city' });
      expect(findAppliedFilter('city_lte')).toEqual({ operator: '_lte', field: 'city' });
      expect(findAppliedFilter('city_gt')).toEqual({ operator: '_gt', field: 'city' });
      expect(findAppliedFilter('city_gte')).toEqual({ operator: '_gte', field: 'city' });
    });
  });

  describe('formatFiltersFromQuery', () => {
    it('should return an empty array if there is no where clause', () => {
      expect(formatFiltersFromQuery({})).toHaveLength(0);
    });

    it('should return array of filter', () => {
      const query = {
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
        ],
      };

      const expected = [
        { name: 'city_ne', filter: '_ne', value: 'paris' },
        { name: 'city', filter: '_ne', value: 'paris' },
        { name: 'city', filter: '=', value: 'paris' },
      ];

      expect(formatFiltersFromQuery(query)).toEqual(expected);
    });
  });
});

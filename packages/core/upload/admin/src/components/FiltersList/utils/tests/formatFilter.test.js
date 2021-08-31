import formatFilter from '../formatFilter';

describe('UPLOAD | components | FiltersList | utils', () => {
  describe('formatFilter', () => {
    it('should format value to readable date if value is a date', () => {
      const filter = {
        name: 'created_at',
        filter: '=',
        value: '2020-03-20T22:33:57+01:00',
      };

      const expected = {
        name: 'created_at',
        filter: '=',
        value: 'Friday, March 20th 2020 21:33',
      };

      expect(formatFilter(filter)).toEqual(expected);
    });

    it('should format filter to = if name is mime and filter is _contains', () => {
      const filter = {
        name: 'mime',
        filter: '_contains',
        value: 'image',
      };

      const expected = {
        name: 'type',
        filter: '=',
        value: 'image',
      };

      expect(formatFilter(filter)).toEqual(expected);
    });

    it('should format filter to _ne if name is mime and filter is _ncontains', () => {
      const filter = {
        name: 'mime',
        filter: '_ncontains',
        value: 'image',
      };

      const expected = {
        name: 'type',
        filter: '_ne',
        value: 'image',
      };

      expect(formatFilter(filter)).toEqual(expected);
    });

    it('should return formatted value if name is size', () => {
      const filter = {
        name: 'size',
        filter: '=',
        value: 1000,
      };

      const expected = {
        name: 'size',
        filter: '=',
        value: '1MB',
      };

      expect(formatFilter(filter)).toEqual(expected);
    });
  });
});

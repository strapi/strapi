import formatFilters from '../formatFilters';

describe('UPLOAD | components | FiltersList | utils', () => {
  describe('formatFilters', () => {
    it('should return initial value if there is no duplicate', () => {
      const filters = [
        {
          name: 'created_at',
          filter: '=',
          value: '2020-03-20T22:33:57+01:00',
        },
      ];

      const expected = [
        {
          name: 'created_at',
          filter: '=',
          value: '2020-03-20T22:33:57+01:00',
        },
      ];

      expect(formatFilters(filters)).toEqual(expected);
    });

    it('should update filters if a duplicata is found', () => {
      const filters = [
        {
          name: 'mime',
          filter: '_contains',
          value: 'image',
        },
        {
          name: 'mime',
          filter: '_contains',
          value: 'video',
        },
      ];

      const expected = [
        {
          name: 'mime',
          filter: '_ncontains',
          value: 'file',
        },
      ];

      expect(formatFilters(filters)).toEqual(expected);
    });
  });
});

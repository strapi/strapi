import formatFilter from '../formatFilter';

describe('UPLOAD | components | FiltersPicker | FiltersCard | utils', () => {
  describe('formatFilter', () => {
    it('should format value to array id name is mime and value is file', () => {
      const filter = {
        name: 'mime',
        filter: '_contains',
        value: 'file',
      };

      const expected = {
        name: 'mime',
        filter: '_ncontains',
        value: ['image', 'video'],
      };

      expect(formatFilter(filter)).toEqual(expected);
    });

    it('should not format value if name is not mime and value is not file', () => {
      const filter = {
        name: 'size',
        filter: '=',
        value: '10KB',
      };

      const expected = {
        name: 'size',
        filter: '=',
        value: '10KB',
      };

      expect(formatFilter(filter)).toEqual(expected);
    });
  });
});

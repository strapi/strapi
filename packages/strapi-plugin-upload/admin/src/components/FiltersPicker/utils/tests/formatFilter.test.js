import moment from 'moment';

import formatFilter from '../formatFilter';

describe('UPLOAD | components | FiltersPicker | utils', () => {
  describe('formatFilter', () => {
    it('should return formatted filter value if name is size', () => {
      const filter = {
        name: 'size',
        filter: '=',
        value: '10MB',
      };

      const expected = {
        name: 'size',
        filter: '=',
        value: 10000,
      };

      expect(formatFilter(filter)).toEqual(expected);
    });

    it('should return converted filter if value is a moment object', () => {
      const momentValue = moment();
      const filter = {
        name: 'created_at',
        filter: '=',
        value: momentValue,
      };

      const expected = {
        name: 'created_at',
        filter: '=',
        value: momentValue.format(),
      };

      expect(formatFilter(filter)).toEqual(expected);
    });
  });
});

import moment from 'moment';

import formatFilter from '../formatFilter';

describe('UPLOAD | components | FiltersPicker | utils', () => {
  describe('formatFilter', () => {
    it('should return current filter if value is not a moment object', () => {
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

import moment from 'moment';
import generateNewFilters from '../generateNewFilters';

describe('UPLOAD | components | FiltersPicker | utils', () => {
  describe('generateNewFilters', () => {
    it('should return current filters with new filter added if it does not exist yet', () => {
      const currentFilters = [
        {
          name: 'size',
          filter: '=',
          value: '10KB',
        },
      ];

      const newFilter = {
        name: 'size',
        filter: '_ne',
        value: '100MO',
      };

      const expected = [
        {
          name: 'size',
          filter: '=',
          value: '10KB',
        },
        {
          name: 'size',
          filter: '_ne',
          value: '100MO',
        },
      ];

      expect(generateNewFilters(currentFilters, newFilter)).toEqual(expected);
    });

    it('should return current filters with formatted filter if value is a date', () => {
      const currentFilters = [
        {
          name: 'size',
          filter: '=',
          value: '10KB',
        },
      ];

      const value = moment.utc([1993, 6, 5]).set({ hour: 0, minute: 0, second: 0 }); // format from buffetjs datepicker

      const newFilter = {
        name: 'created_at',
        filter: '=',
        value,
      };

      const expected = [
        {
          name: 'size',
          filter: '=',
          value: '10KB',
        },
        {
          name: 'created_at',
          filter: '=',
          value: moment(value).format(),
        },
      ];

      expect(generateNewFilters(currentFilters, newFilter)).toEqual(expected);
    });
  });
});

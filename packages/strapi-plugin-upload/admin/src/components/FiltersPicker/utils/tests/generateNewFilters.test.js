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
          filter: 'is',
          value: '10KB',
        },
      ];

      const newFilter = {
        name: 'created_at',
        filter: 'is',
        value: moment([1993, 6, 5])
          .set({ hour: 0, minute: 0, second: 0 })
          .toISOString(), // format from buffetjs datepicker
      };

      const expected = [
        {
          name: 'size',
          filter: 'is',
          value: '10KB',
        },
        {
          name: 'created_at',
          filter: 'is',
          value: '1993-07-04T22:00:00.000Z',
        },
      ];

      expect(generateNewFilters(currentFilters, newFilter)).toEqual(expected);
    });

    it('should return current filters with two new filters if value is an array', () => {
      const currentFilters = [
        {
          name: 'size',
          filter: 'is',
          value: '10KB',
        },
      ];

      const newFilter = {
        name: 'mime',
        filter: '_contains',
        value: ['image', 'video'],
      };

      const expected = [
        {
          name: 'size',
          filter: 'is',
          value: '10KB',
        },
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

      expect(generateNewFilters(currentFilters, newFilter)).toEqual(expected);
    });
  });
});

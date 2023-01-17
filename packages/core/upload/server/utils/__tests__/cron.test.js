'use strict';

const { getWeeklyCronScheduleAt } = require('../cron');

describe('cron', () => {
  describe('getWeeklyCronScheduleAt', () => {
    test('2022-07-22T15:43:40.036 => 40 43 15 * * 5', () => {
      const date = new Date('2022-07-22T15:43:40.036'); // it's a friday

      const result = getWeeklyCronScheduleAt(date);
      expect(result).toBe('40 43 15 * * 5');
    });
  });
});

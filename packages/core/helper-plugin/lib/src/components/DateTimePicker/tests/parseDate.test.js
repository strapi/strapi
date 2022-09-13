import { parseDate } from '../parseDate';

describe('parseDate', () => {
  it('should return a date', () => {
    expect(parseDate('2021-11-05T15:37:29.592Z') instanceof Date).toBeTruthy();
  });
  it('should return null if the passed params has not the right format', () => {
    expect(parseDate('test')).toBeNull();
  });
});

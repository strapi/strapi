/**
 * In Paris, so a release's time can fall in the browser's DST gap
 *
 * @jest-environment @strapi/admin-test-utils/environment
 * @jest-environment-options {"strapi": {"tz": "Europe/Paris"}}
 */
import { getTimezoneOffset, getWallClock } from '../time';

describe('getTimezoneOffset', () => {
  it('should return correct offset for UTC timezone', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const offset = getTimezoneOffset('UTC', date);
    expect(offset).toBe('UTC+00:00');
  });

  it('should return correct offset for timezone without daylight', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const offset = getTimezoneOffset('Europe/Paris', date);
    expect(offset).toBe('UTC+01:00');
  });

  it('should return correct offset for timezone with daylight', () => {
    const date = new Date('2024-06-06T00:00:00Z');
    const offset = getTimezoneOffset('Europe/Paris', date);
    expect(offset).toBe('UTC+02:00');
  });

  it('should return empty string for invalid timezone', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const offset = getTimezoneOffset('Invalid/Timezone', date);
    expect(offset).toBe('');
  });
});

describe('getWallClock', () => {
  it("reads a release's time in its timezone, also when the browser's clock skips it", () => {
    // 02:30 UTC on 29 March 2026: Paris clocks jump from 02:00 to 03:00 that night
    expect(getWallClock(new Date('2026-03-29T02:30:00.000Z'), 'UTC')).toEqual({
      date: '2026-03-29',
      time: '02:30',
    });
  });

  it('reads the day in the timezone, not in the browser', () => {
    expect(getWallClock(new Date('2026-08-20T23:30:00.000Z'), 'Asia/Tokyo')).toEqual({
      date: '2026-08-21',
      time: '08:30',
    });
  });
});

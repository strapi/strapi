/**
 * The database layer reads and formats dates in local time: these cases only differ from UTC in a
 * timezone that is not UTC, which the environment below sets for this file.
 *
 * @jest-environment ../../../tests/setup/timezone-environment.js
 * @jest-environment-options {"strapi": {"tz": "Europe/Paris"}}
 */
import { isComponentUnchanged } from '../components';

const schema = {
  uid: 'test.dates',
  attributes: {
    day: { type: 'date' },
    when: { type: 'datetime' },
  },
} as any;

const check = (stored: Record<string, unknown>, data: Record<string, unknown>) =>
  isComponentUnchanged(schema, stored, data);

describe('isComponentUnchanged on a server that is not in UTC', () => {
  it('runs in Europe/Paris', () => {
    expect(new Date(2024, 0, 1).toISOString()).toBe('2023-12-31T23:00:00.000Z');
  });

  it('reads a datetime sent without a time in local time, as the database does', () => {
    // the database stores '2024-01-01' as local midnight, which is not the UTC midnight stored
    expect(check({ when: '2024-01-01T00:00:00.000Z' }, { when: '2024-01-01' })).toBe(false);
    expect(check({ when: '2023-12-31T23:00:00.000Z' }, { when: '2024-01-01' })).toBe(true);
  });

  it('reduces a Date sent for a date to its local day, as the database does', () => {
    // 23:30 UTC on the 1st is 00:30 on the 2nd in Paris
    const lateEvening = new Date('2024-01-01T23:30:00.000Z');

    expect(check({ day: '2024-01-01' }, { day: lateEvening })).toBe(false);
    expect(check({ day: '2024-01-02' }, { day: lateEvening })).toBe(true);
  });
});

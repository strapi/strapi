/**
 * Days and times are the viewer's: run in a timezone with a DST change, not the default UTC
 * @jest-environment @strapi/admin-test-utils/environment
 * @jest-environment-options {"strapi": {"tz": "Europe/Paris"}}
 */
import {
  joinScheduleFilterValue,
  splitScheduleFilterValue,
  toReleasesApiFilters,
} from '../scheduleFilters';

// Expectations are built in the timezone the tests run in
const local = (...parts: [number, number, number, number?, number?, number?, number?]) =>
  new Date(
    parts[0],
    parts[1],
    parts[2],
    parts[3] ?? 0,
    parts[4] ?? 0,
    parts[5] ?? 0,
    parts[6] ?? 0
  ).toISOString();

describe('schedule filter values', () => {
  it('stores a date alone as the day, and a date and time as the instant', () => {
    const date = new Date(2026, 9, 23);

    expect(joinScheduleFilterValue(date)).toBe('2026-10-23');
    expect(joinScheduleFilterValue(date, '10:53')).toBe(local(2026, 9, 23, 10, 53));
    // Locales writing times as `10.53`
    expect(joinScheduleFilterValue(date, '10.53')).toBe(local(2026, 9, 23, 10, 53));
    expect(joinScheduleFilterValue(undefined, '10:53')).toBe('');
  });

  it('reads back what it stores', () => {
    expect(splitScheduleFilterValue('2026-10-23')).toEqual({ date: new Date(2026, 9, 23) });
    expect(splitScheduleFilterValue(local(2026, 9, 23, 10, 53))).toEqual({
      date: new Date(2026, 9, 23),
      time: '10:53',
    });
  });

  it.each([undefined, '', 'blocked', 'true', '2026-13-45', '2026-02-30'])(
    'reads %p as no value',
    (value) => {
      expect(splitScheduleFilterValue(value)).toEqual({});
    }
  );
});

describe('toReleasesApiFilters', () => {
  // Released at 10:53:04.506: the picker never produces seconds
  const RELEASED_AT = local(2026, 9, 23, 10, 53, 4, 506);

  const matches = (filter: Record<string, unknown>, value: string): boolean => {
    if ('$or' in filter) {
      return (filter.$or as Record<string, unknown>[]).some((entry) => matches(entry, value));
    }

    const [condition] = Object.values(filter) as Record<string, string>[];
    return Object.entries(condition).every(([operator, bound]) =>
      operator === '$gte' ? value >= bound : value < bound
    );
  };

  const findsRelease = (operator: string, value: string) => {
    const [filter] = toReleasesApiFilters([{ releasedAt: { [operator]: value } }]);
    return matches(filter, RELEASED_AT);
  };

  it.each([
    ['$eq', '2026-10-23', true],
    ['$eq', local(2026, 9, 23, 10, 53), true],
    ['$eq', local(2026, 9, 23, 10, 52), false],
    ['$eq', '2026-10-22', false],
    ['$ne', '2026-10-23', false],
    ['$ne', local(2026, 9, 23, 10, 53), false],
    ['$ne', '2026-10-24', true],
    ['$lt', '2026-10-23', false],
    ['$lte', '2026-10-23', true],
    ['$gt', '2026-10-23', false],
    ['$gt', '2026-10-22', true],
    ['$gte', '2026-10-23', true],
    ['$gte', local(2026, 9, 23, 10, 54), false],
    ['$lte', local(2026, 9, 23, 10, 53), true],
  ])('releasedAt %s %s finds the release: %p', (operator, value, expected) => {
    expect(findsRelease(operator, value)).toBe(expected);
  });

  it('sends the bounds of the day or minute', () => {
    expect(
      toReleasesApiFilters([
        { scheduledAt: { $eq: '2026-10-23' } },
        { releasedAt: { $ne: local(2026, 9, 23, 10, 53) } },
      ])
    ).toEqual([
      { scheduledAt: { $gte: local(2026, 9, 23), $lt: local(2026, 9, 24) } },
      {
        $or: [
          { releasedAt: { $lt: local(2026, 9, 23, 10, 53) } },
          { releasedAt: { $gte: local(2026, 9, 23, 10, 54) } },
        ],
      },
    ]);
  });

  it('covers a day with a DST change from midnight to midnight, not 24 hours', () => {
    // Oct 25, 2026: clocks go back an hour in Paris, the day lasts 25 hours
    expect(toReleasesApiFilters([{ scheduledAt: { $eq: '2026-10-25' } }])).toEqual([
      { scheduledAt: { $gte: '2026-10-24T22:00:00.000Z', $lt: '2026-10-25T23:00:00.000Z' } },
    ]);
  });

  it('keeps every operator of a filter that has several', () => {
    expect(
      toReleasesApiFilters([
        { releasedAt: { $gte: '2026-10-23', $lte: '2026-10-24', $notNull: 'true' } },
      ])
    ).toEqual([
      {
        $and: [
          { releasedAt: { $gte: local(2026, 9, 23) } },
          { releasedAt: { $lt: local(2026, 9, 25) } },
          { releasedAt: { $notNull: 'true' } },
        ],
      },
    ]);
  });

  it('sends other filters, "is null" and unreadable dates as they are', () => {
    const filters = [
      { status: { $eq: 'done' } },
      { scheduledAt: { $null: 'true' } },
      { releasedAt: { $notNull: 'true' } },
      { releasedAt: { $eq: 'not a date' } },
      { releasedAt: { $eq: '2026-13-45' } },
      { releasedAt: {} },
    ];

    expect(toReleasesApiFilters(filters)).toEqual(filters);
  });
});

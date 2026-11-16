/**
 * Days and times are the viewer's: run in a timezone with a DST change, not the default UTC
 * @jest-environment @strapi/admin-test-utils/environment
 * @jest-environment-options {"strapi": {"tz": "Europe/Paris"}}
 */
import {
  joinDateTimeFilterValue,
  splitDateTimeFilterValue,
  toApiFilters,
} from '../dateTimeFilters';

import type { Filters } from '../../components/Filters';

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

const CustomInput = () => null;

const OPTIONS: Filters.Filter[] = [
  { name: 'publishedAt', label: 'Published at', type: 'datetime' },
  { name: 'createdAt', label: 'Created at', type: 'datetime' },
  {
    name: 'event',
    label: 'Event',
    type: 'relation',
    mainField: { name: 'startsAt', type: 'datetime' },
  },
  { name: 'author', label: 'Author', type: 'relation', mainField: { name: 'id', type: 'integer' } },
  { name: 'birthday', label: 'Birthday', type: 'date' },
  { name: 'scheduledAt', label: 'Scheduled at', type: 'datetime', input: CustomInput },
];

describe('date-time filter values', () => {
  it('stores a date alone as the day, and a date and time as the instant', () => {
    const date = new Date(2026, 9, 23);

    expect(joinDateTimeFilterValue(date)).toBe('2026-10-23');
    expect(joinDateTimeFilterValue(date, '10:53')).toBe(local(2026, 9, 23, 10, 53));
    // Locales writing times as `10.53`
    expect(joinDateTimeFilterValue(date, '10.53')).toBe(local(2026, 9, 23, 10, 53));
    expect(joinDateTimeFilterValue(undefined, '10:53')).toBe('');
  });

  it('reads back what it stores', () => {
    expect(splitDateTimeFilterValue('2026-10-23')).toEqual({ date: new Date(2026, 9, 23) });
    expect(splitDateTimeFilterValue(local(2026, 9, 23, 10, 53))).toEqual({
      date: new Date(2026, 9, 23),
      time: '10:53',
    });
  });

  it.each([undefined, '', 'blocked', 'true', '2026-13-45', '2026-02-30'])(
    'reads %p as no value',
    (value) => {
      expect(splitDateTimeFilterValue(value)).toEqual({});
    }
  );
});

describe('toApiFilters', () => {
  // Published at 10:53:04.506: the picker never produces seconds
  const PUBLISHED_AT = local(2026, 9, 23, 10, 53, 4, 506);

  const matches = (filter: Record<string, unknown>, value: string): boolean => {
    if ('$or' in filter) {
      return (filter.$or as Record<string, unknown>[]).some((entry) => matches(entry, value));
    }

    const [condition] = Object.values(filter) as Record<string, string>[];
    return Object.entries(condition).every(([operator, bound]) =>
      operator === '$gte' ? value >= bound : value < bound
    );
  };

  const findsEntry = (operator: string, value: string) => {
    const { $and } = toApiFilters({ $and: [{ publishedAt: { [operator]: value } }] }, OPTIONS);
    return matches($and![0], PUBLISHED_AT);
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
  ])('publishedAt %s %s finds the entry: %p', (operator, value, expected) => {
    expect(findsEntry(operator, value)).toBe(expected);
  });

  it('sends the bounds of the day or minute', () => {
    expect(
      toApiFilters(
        {
          $and: [
            { publishedAt: { $eq: '2026-10-23' } },
            { createdAt: { $ne: local(2026, 9, 23, 10, 53) } },
          ],
        },
        OPTIONS
      )
    ).toEqual({
      $and: [
        { publishedAt: { $gte: local(2026, 9, 23), $lt: local(2026, 9, 24) } },
        {
          $or: [
            { createdAt: { $lt: local(2026, 9, 23, 10, 53) } },
            { createdAt: { $gte: local(2026, 9, 23, 10, 54) } },
          ],
        },
      ],
    });
  });

  it('keeps a full ISO value from an older link working, as its minute', () => {
    expect(
      toApiFilters({ $and: [{ publishedAt: { $eq: '2026-10-23T08:53:02.123Z' } }] }, OPTIONS)
    ).toEqual({
      $and: [
        {
          publishedAt: { $gte: '2026-10-23T08:53:00.000Z', $lt: '2026-10-23T08:54:00.000Z' },
        },
      ],
    });
  });

  it('covers a day with a DST change from midnight to midnight, not 24 hours', () => {
    // Oct 25, 2026: clocks go back an hour in Paris, the day lasts 25 hours
    expect(toApiFilters({ $and: [{ publishedAt: { $eq: '2026-10-25' } }] }, OPTIONS)).toEqual({
      $and: [
        { publishedAt: { $gte: '2026-10-24T22:00:00.000Z', $lt: '2026-10-25T23:00:00.000Z' } },
      ],
    });
  });

  it('keeps every operator of a filter that has several', () => {
    expect(
      toApiFilters(
        { $and: [{ publishedAt: { $gte: '2026-10-23', $lte: '2026-10-24', $notNull: 'true' } }] },
        OPTIONS
      )
    ).toEqual({
      $and: [
        {
          $and: [
            { publishedAt: { $gte: local(2026, 9, 23) } },
            { publishedAt: { $lt: local(2026, 9, 25) } },
            { publishedAt: { $notNull: 'true' } },
          ],
        },
      ],
    });
  });

  it("bounds a relation's date-time main field within the relation", () => {
    expect(
      toApiFilters(
        {
          $and: [
            { event: { startsAt: { $eq: '2026-10-23' } } },
            { event: { startsAt: { $ne: '2026-10-23' } } },
          ],
        },
        OPTIONS
      )
    ).toEqual({
      $and: [
        { event: { startsAt: { $gte: local(2026, 9, 23), $lt: local(2026, 9, 24) } } },
        {
          event: {
            $or: [
              { startsAt: { $lt: local(2026, 9, 23) } },
              { startsAt: { $gte: local(2026, 9, 24) } },
            ],
          },
        },
      ],
    });
  });

  it('sends other filters, "is null", custom inputs and unreadable dates as they are', () => {
    const filters = {
      $and: [
        { author: { id: { $eq: '1' } } },
        { birthday: { $eq: '2026-10-23' } },
        { scheduledAt: { $eq: '2026-10-23' } },
        { unknown: { $eq: '2026-10-23' } },
        { publishedAt: { $null: 'true' } },
        { publishedAt: { $eq: 'not a date' } },
        { publishedAt: { $eq: '2026-13-45' } },
        { publishedAt: {} },
        { event: 'not an object' },
      ],
      _q: 'kept',
    };

    expect(toApiFilters(filters, OPTIONS)).toEqual(filters);
  });

  it.each([undefined, {}, { $and: 'not a list' }])('returns %p as it is', (filters) => {
    expect(toApiFilters(filters, OPTIONS)).toEqual(filters);
  });
});

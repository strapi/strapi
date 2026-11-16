/**
 * The release date filters (scheduled for, released on) take a date and an optional time:
 * - a date alone, stored as `YYYY-MM-DD`, matches that whole day
 * - a date and a time, stored as an ISO string, matches that minute
 * Stored dates have seconds and milliseconds, so both are sent to the API as bounds.
 * Days and times are the viewer's, like the pickers they come from.
 */

const SCHEDULE_FILTER_FIELDS = ['scheduledAt', 'releasedAt'] as const;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{1,2})\D(\d{2})$/;
const MINUTE = 60 * 1000;

type FilterEntry = Record<string, unknown>;

interface ScheduleFilterValue {
  // Local midnight of the picked day
  date?: Date;
  // `HH:mm`
  time?: string;
}

const pad = (number: number) => String(number).padStart(2, '0');

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Anything else (e.g. the value of the previously selected field) reads as no value
 */
const splitScheduleFilterValue = (value: unknown): ScheduleFilterValue => {
  if (typeof value !== 'string' || !value) {
    return {};
  }

  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly.map(Number);
    const date = new Date(year, month - 1, day);
    // `2026-13-45` would roll over to a real day
    return date.getMonth() === month - 1 && date.getDate() === day ? { date } : {};
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {};
  }

  return {
    date: startOfDay(date),
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
};

const joinScheduleFilterValue = (date?: Date, time?: string): string => {
  if (!date) {
    return '';
  }

  const match = time ? TIME.exec(time) : null;
  if (!match) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  const [, hours, minutes] = match.map(Number);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes
  ).toISOString();
};

/**
 * The instants a value covers: [start, end)
 */
const getScheduleFilterBounds = (value: unknown) => {
  const { date, time } = splitScheduleFilterValue(value);
  if (!date) {
    return null;
  }

  if (!time) {
    return {
      start: date,
      // Not +24h: a day with a DST change is 23 or 25 hours long
      end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
    };
  }

  const start = new Date(joinScheduleFilterValue(date, time));

  return { start, end: new Date(start.getTime() + MINUTE) };
};

const toScheduleCondition = (field: string, operator: string, value: unknown) => {
  const bounds = getScheduleFilterBounds(value);
  if (!bounds) {
    return null;
  }

  const start = bounds.start.toISOString();
  const end = bounds.end.toISOString();

  switch (operator) {
    case '$eq':
      return { [field]: { $gte: start, $lt: end } };
    case '$ne':
      return { $or: [{ [field]: { $lt: start } }, { [field]: { $gte: end } }] };
    case '$lt':
      return { [field]: { $lt: start } };
    case '$lte':
      return { [field]: { $lt: end } };
    case '$gt':
      return { [field]: { $gte: end } };
    case '$gte':
      return { [field]: { $gte: start } };
    default:
      return null;
  }
};

/**
 * The filters as the API reads them: a date filter becomes the bounds of its day or minute.
 * Other filters, and "is null" / "is not null", are sent as they are.
 */
const toReleasesApiFilters = (filters: FilterEntry[]): FilterEntry[] =>
  filters.map((filter) => {
    const [field] = Object.keys(filter);
    const condition = filter[field];

    if (
      !(SCHEDULE_FILTER_FIELDS as readonly string[]).includes(field) ||
      typeof condition !== 'object' ||
      condition === null
    ) {
      return filter;
    }

    // The popover sets one operator, a hand-edited URL can set more: none of them is dropped
    const conditions = Object.entries(condition).map(
      ([operator, value]) =>
        toScheduleCondition(field, operator, value) ?? { [field]: { [operator]: value } }
    );

    if (conditions.length === 1) {
      return conditions[0];
    }

    return conditions.length ? { $and: conditions } : filter;
  });

export { joinScheduleFilterValue, splitScheduleFilterValue, toReleasesApiFilters };

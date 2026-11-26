/**
 * A date-time filter takes a date and an optional time:
 * - a date alone, stored as `YYYY-MM-DD`, matches that whole day
 * - a date and a time, stored as an ISO string, matches that minute
 * Stored values have seconds and milliseconds, so both are sent to the API as bounds.
 * Days and times are the viewer's, like the pickers they come from.
 */
import { isObject } from './objects';

import type { Filters } from '../components/Filters';

type FilterOption = Pick<Filters.Filter, 'name' | 'type' | 'mainField' | 'input'>;

type DateTimeFilterValue =
  | { date?: never; time?: never }
  | {
      // Local midnight of the picked day
      date: Date;
      // `HH:mm`
      time?: string;
    };

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{1,2})\D(\d{2})$/;
const MINUTE = 60 * 1000;

const pad = (number: number) => String(number).padStart(2, '0');

/**
 * Date-time filters without an input of their own take a date and an optional time.
 * The popover, the tag and `toApiFilters` all read it from here.
 */
const takesDateTimeValue = (filter: FilterOption) =>
  !filter.input && (filter.mainField?.type ?? filter.type) === 'datetime';

/**
 * Anything else (e.g. the value of the previously selected field) reads as no value
 */
const splitDateTimeFilterValue = (value: unknown): DateTimeFilterValue => {
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
    date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
};

const joinDateTimeFilterValue = (date?: Date, time?: string): string => {
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
const getBounds = (value: unknown) => {
  const { date, time } = splitDateTimeFilterValue(value);
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

  const start = new Date(joinDateTimeFilterValue(date, time));

  return { start, end: new Date(start.getTime() + MINUTE) };
};

const toBoundedClause = (field: string, operator: string, value: unknown) => {
  const bounds = getBounds(value);
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
 * `{ [field]: { [operator]: value } }` with every date-time value as the bounds it covers
 */
const toBoundedWhere = (field: string, condition: unknown) => {
  if (!isObject(condition)) {
    return null;
  }

  // The popover sets one operator, a hand-edited URL can set more: none of them is dropped
  const clauses = Object.entries(condition).map(
    ([operator, value]) =>
      toBoundedClause(field, operator, value) ?? { [field]: { [operator]: value } }
  );

  if (clauses.length === 0) {
    return null;
  }

  return clauses.length === 1 ? clauses[0] : { $and: clauses };
};

const toApiFilter = (entry: unknown, options: FilterOption[]) => {
  if (!isObject(entry)) {
    return entry;
  }

  const [name] = Object.keys(entry);
  const option = options.find((filter) => filter.name === name);
  if (!option || !takesDateTimeValue(option)) {
    return entry;
  }

  // A relation filters on its main field, like the popover stores it
  if (option.type === 'relation' && option.mainField) {
    const relationCondition = entry[name];
    const where = isObject(relationCondition)
      ? toBoundedWhere(option.mainField.name, relationCondition[option.mainField.name])
      : null;

    return where ? { [name]: where } : entry;
  }

  return toBoundedWhere(name, entry[name]) ?? entry;
};

/**
 * The filters as the API reads them: a date-time filter becomes the bounds of its day or minute.
 * Other filters, and "is null" / "is not null", are sent as they are.
 * `options` are the ones given to `Filters.Root`: they say which filters take a date-time value.
 */
const toApiFilters = <TFilters extends { $and?: unknown } | undefined>(
  filters: TFilters,
  options: FilterOption[]
): TFilters => {
  if (!filters || !Array.isArray(filters.$and)) {
    return filters;
  }

  return { ...filters, $and: filters.$and.map((entry) => toApiFilter(entry, options)) };
};

export { joinDateTimeFilterValue, splitDateTimeFilterValue, takesDateTimeValue, toApiFilters };

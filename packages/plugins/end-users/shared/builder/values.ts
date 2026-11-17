import { BUILDER_LIMITS } from './types';
import { PATTERN_OPERATORS, takesList, takesNoValue } from './operators';
import type { FilterableType } from './operators';

export const VALUE_KINDS = {
  string: 'string',
  text: 'string',
  richtext: 'string',
  email: 'string',
  uid: 'string',
  enumeration: 'string',
  date: 'string',
  datetime: 'string',
  time: 'string',
  biginteger: 'string',
  integer: 'number',
  float: 'number',
  decimal: 'number',
  boolean: 'boolean',
} as const satisfies Record<FilterableType, 'string' | 'number' | 'boolean'>;

const KIND_TEXT = { string: 'a text', number: 'a number', boolean: 'true or false' } as const;

/** What a date, a time and a date and time are written as: the forms a fixed value and a stored one share */
export const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,3})?)?$/;
export const DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

// The engine reads a text starting with one of these as a placeholder, so a fixed value can't hold it
const PLACEHOLDER_TEXT = /^\$(user|profile|params|now)/;

const isRealDate = (year: number, month: number, day: number): boolean => {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

const scalarProblem = (
  type: FilterableType,
  operator: string,
  value: unknown,
  enumValues?: readonly string[]
): string | null => {
  // A pattern is a text, whatever the field
  const kind = PATTERN_OPERATORS.includes(operator) ? 'string' : VALUE_KINDS[type];
  const fits =
    kind === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === kind;

  if (!fits) {
    return `${operator} takes ${KIND_TEXT[kind]}`;
  }

  if (kind === 'string') {
    const text = value as string;

    if (text.length > BUILDER_LIMITS.textLength) {
      return `a text can hold at most ${BUILDER_LIMITS.textLength} characters`;
    }

    if (PLACEHOLDER_TEXT.test(text)) {
      return "a text can't start with $user, $profile, $params or $now";
    }

    if (PATTERN_OPERATORS.includes(operator)) {
      return text === '' ? `${operator} with an empty text matches every entry` : null;
    }

    switch (type) {
      case 'date': {
        const match = DATE.exec(text);

        return match && isRealDate(Number(match[1]), Number(match[2]), Number(match[3]))
          ? null
          : 'a date is written YYYY-MM-DD';
      }
      case 'datetime': {
        const match = DATETIME.exec(text);

        return match &&
          isRealDate(Number(match[1]), Number(match[2]), Number(match[3])) &&
          !Number.isNaN(Date.parse(text))
          ? null
          : 'a date and time is written as ISO 8601 with a time zone, such as 2026-11-04T09:30:00Z';
      }
      case 'time':
        return TIME.test(text) ? null : 'a time is written HH:mm, HH:mm:ss or HH:mm:ss.SSS';
      case 'biginteger':
        return /^-?\d+$/.test(text) ? null : 'a biginteger is a string of digits';
      case 'enumeration':
        return enumValues && !enumValues.includes(text)
          ? `${text} is not one of ${enumValues.join(', ')}`
          : null;
      default:
        return null;
    }
  }

  if (type === 'integer' && !Number.isInteger(value)) {
    return 'an integer has no decimals';
  }

  return null;
};

/**
 * `null` when the value fits the field's type and operator, else what is wrong with it.
 *
 * Callers must pass `enumValues` for `enumeration` fields: without them any text passes. It does not check that the
 * operator is offered for the type either; callers check `operatorsFor(type).includes(operator)` first.
 */
export const valueProblem = (
  type: FilterableType,
  operator: string,
  value: unknown,
  enumValues?: readonly string[]
): string | null => {
  if (takesNoValue(operator)) {
    return typeof value === 'boolean' ? null : `${operator} takes true or false`;
  }

  if (takesList(operator)) {
    if (!Array.isArray(value) || value.length === 0) {
      return `${operator} takes a list with at least one value`;
    }

    if (value.length > BUILDER_LIMITS.listValues) {
      return `a list can hold at most ${BUILDER_LIMITS.listValues} values`;
    }

    for (const item of value) {
      const problem = scalarProblem(type, operator, item, enumValues);

      if (problem) {
        return problem;
      }
    }

    return null;
  }

  return scalarProblem(type, operator, value, enumValues);
};

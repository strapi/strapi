import { describe, it, expect } from 'vitest';

import DatetimeField from '../datetime';
import TimestampField from '../timestamp';

describe('DatetimeField', () => {
  const field = new DatetimeField({});

  it('toDB returns a Date for ISO input', () => {
    const result = field.toDB('2024-06-15T10:00:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect((result as Date).toISOString()).toBe('2024-06-15T10:00:00.000Z');
  });

  it.each([
    ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z'],
    [new Date('2024-06-15T10:00:00.000Z'), '2024-06-15T10:00:00.000Z'],
  ])('fromDB converts %p to ISO string', (input, expected) => {
    expect(field.fromDB(input)).toBe(expected);
  });

  it('fromDB returns null for invalid dates', () => {
    expect(field.fromDB('invalid')).toBeNull();
  });
});

describe('TimestampField', () => {
  const field = new TimestampField({});

  it('toDB returns a Date for ISO input', () => {
    const result = field.toDB('2024-06-15T10:00:00.000Z');
    expect(result).toBeInstanceOf(Date);
  });

  it('fromDB formats valid timestamps using date-fns T token', () => {
    const input = '2024-06-15T10:00:00.000Z';
    const result = field.fromDB(input);

    expect(typeof result).toBe('string');
    // date-fns `format(date, 'T')` stores unix milliseconds as a string in this codebase
    expect(result).toBe(String(new Date(input).getTime()));
  });

  it('fromDB returns null for invalid input', () => {
    expect(field.fromDB('not-a-date')).toBeNull();
  });
});

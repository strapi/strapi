import { describe, it, expect } from 'vitest';

import { parseDate, parseTime, parseDateTimeOrTimestamp } from '../parsers';
import InvalidDateError from '../../../errors/invalid-date';
import InvalidTimeError from '../../../errors/invalid-time';
import InvalidDateTimeError from '../../../errors/invalid-datetime';

describe('field parsers', () => {
  describe('parseDate', () => {
    it('formats Date instances as yyyy-MM-dd', () => {
      expect(parseDate(new Date('2024-06-15T12:00:00.000Z'))).toBe('2024-06-15');
    });

    it.each(['2024-06-15', '2024-01-01'])('accepts valid date string %s', (value) => {
      expect(parseDate(value)).toBe(value);
    });

    it('throws InvalidDateError for invalid input', () => {
      expect(() => parseDate('not-a-date')).toThrow(InvalidDateError);
      expect(() => parseDate('')).toThrow(InvalidDateError);
      expect(() => parseDate(123)).toThrow(InvalidDateError);
    });
  });

  describe('parseTime', () => {
    it('formats Date instances as HH:mm:ss.SSS', () => {
      const date = new Date('1970-01-01T14:30:05.040Z');
      expect(parseTime(date)).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    });

    it.each([
      ['14:30:05', '14:30:05.000'],
      ['14:30:05.5', '14:30:05.500'],
      ['14:30:05.123', '14:30:05.123'],
      ['00:00:00', '00:00:00.000'],
      ['23:59:59.999', '23:59:59.999'],
    ])('normalizes time string %s to %s', (input, expected) => {
      expect(parseTime(input)).toBe(expected);
    });

    it('throws InvalidTimeError for invalid input', () => {
      expect(() => parseTime('25:00:00')).toThrow(InvalidTimeError);
      expect(() => parseTime('12:60:00')).toThrow(InvalidTimeError);
      expect(() => parseTime(123)).toThrow(InvalidTimeError);
    });
  });

  describe('parseDateTimeOrTimestamp', () => {
    it('returns Date instances unchanged', () => {
      const date = new Date('2024-06-15T10:00:00.000Z');
      expect(parseDateTimeOrTimestamp(date)).toBe(date);
    });

    it('parses ISO strings', () => {
      const result = parseDateTimeOrTimestamp('2024-06-15T10:00:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-06-15T10:00:00.000Z');
    });

    it('throws InvalidDateTimeError for invalid input', () => {
      expect(() => parseDateTimeOrTimestamp('not-a-datetime')).toThrow(InvalidDateTimeError);
    });
  });
});

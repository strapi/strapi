'use strict';

const format = require('date-fns/format');
const parseType = require('../parse-type');

describe('parseType', () => {
  describe('boolean', () => {
    it('Handles string booleans', () => {
      expect(parseType({ type: 'boolean', value: 'true' })).toBe(true);
      expect(parseType({ type: 'boolean', value: 't' })).toBe(true);
      expect(parseType({ type: 'boolean', value: '1' })).toBe(true);

      expect(parseType({ type: 'boolean', value: 'false' })).toBe(false);
      expect(parseType({ type: 'boolean', value: 'f' })).toBe(false);
      expect(parseType({ type: 'boolean', value: '0' })).toBe(false);

      expect(() => parseType({ type: 'boolean', value: 'test' })).toThrow();
    });

    it('Handles numerical booleans', () => {
      expect(parseType({ type: 'boolean', value: 1 })).toBe(true);

      expect(parseType({ type: 'boolean', value: 0 })).toBe(false);

      expect(() => parseType({ type: 'boolean', value: 12 })).toThrow();
    });
  });

  describe('Time', () => {
    it('Always returns the same time format', () => {
      expect(parseType({ type: 'time', value: '12:31:11' })).toBe('12:31:11.000');
      expect(parseType({ type: 'time', value: '12:31:11.2' })).toBe('12:31:11.200');
      expect(parseType({ type: 'time', value: '12:31:11.31' })).toBe('12:31:11.310');
      expect(parseType({ type: 'time', value: '12:31:11.319' })).toBe('12:31:11.319');
    });

    it('Throws on  invalid time format', () => {
      expect(() => parseType({ type: 'time', value: '25:12:09' })).toThrow();
      expect(() => parseType({ type: 'time', value: '23:78:09' })).toThrow();
      expect(() => parseType({ type: 'time', value: '23:11:99' })).toThrow();

      expect(() => parseType({ type: 'time', value: '12:12' })).toThrow();
      expect(() => parseType({ type: 'time', value: 'test' })).toThrow();
      expect(() => parseType({ type: 'time', value: 122 })).toThrow();
      expect(() => parseType({ type: 'time', value: {} })).toThrow();
      expect(() => parseType({ type: 'time', value: [] })).toThrow();
    });
  });

  describe('Date', () => {
    it('Supports ISO formats and always returns the right format', () => {
      expect(parseType({ type: 'date', value: '2019-01-01 12:01:11' })).toBe('2019-01-01');

      expect(parseType({ type: 'date', value: '2018-11-02' })).toBe('2018-11-02');

      const isoDateFormat = new Date().toISOString();
      const expectedDateFormat = format(new Date(isoDateFormat), 'yyyy-MM-dd');

      expect(parseType({ type: 'date', value: isoDateFormat })).toBe(expectedDateFormat);
    });

    it('Throws on invalid formator dates', () => {
      expect(() => parseType({ type: 'date', value: '-1029-11-02' })).toThrow(
        'Invalid format, expected an ISO compatible date'
      );
      expect(() => parseType({ type: 'date', value: '2019-13-02' })).toThrow(
        'Invalid format, expected an ISO compatible date'
      );
      expect(() => parseType({ type: 'date', value: '2019-12-32' })).toThrow(
        'Invalid format, expected an ISO compatible date'
      );
      expect(() => parseType({ type: 'date', value: '2019-02-31' })).toThrow(
        'Invalid format, expected an ISO compatible date'
      );
    });
  });

  describe('Datetime', () => {
    it.each(['2019-01-01', '2019-01-01 10:11:12', '1234567890111', '2019-01-01T10:11:12.123Z'])(
      'Supports ISO formats and always returns a date %s',
      value => {
        const r = parseType({ type: 'datetime', value });
        expect(r instanceof Date).toBe(true);
      }
    );
  });
});

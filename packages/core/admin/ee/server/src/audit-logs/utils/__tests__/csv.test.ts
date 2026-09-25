import { escapeCsvValue, serializeCsvLine } from '../csv';

describe('csv', () => {
  describe('escapeCsvValue', () => {
    it('returns an empty string for null', () => {
      expect(escapeCsvValue(null)).toBe('');
    });

    it('returns an empty string for undefined', () => {
      expect(escapeCsvValue(undefined)).toBe('');
    });

    it('keeps plain values untouched', () => {
      expect(escapeCsvValue('entry.update')).toBe('entry.update');
      expect(escapeCsvValue(42)).toBe('42');
    });

    it('does not corrupt negative numbers with the formula guard', () => {
      expect(escapeCsvValue(-5)).toBe('-5');
    });

    it('quotes values containing commas, quotes or newlines', () => {
      expect(escapeCsvValue('Doe, Jane')).toBe('"Doe, Jane"');
      expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
      expect(escapeCsvValue('line\nbreak')).toBe('"line\nbreak"');
    });

    it('neutralizes strings that spreadsheets would evaluate as formulas', () => {
      expect(escapeCsvValue('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
      expect(escapeCsvValue('+123')).toBe("'+123");
      expect(escapeCsvValue('-cmd')).toBe("'-cmd");
      expect(escapeCsvValue('@import')).toBe("'@import");
    });

    it('quotes JSON payloads because they contain commas and quotes', () => {
      expect(escapeCsvValue('{"model":"article","id":1}')).toBe(
        '"{""model"":""article"",""id"":1}"'
      );
    });

    it('serializes objects and arrays as JSON instead of [object Object]', () => {
      expect(escapeCsvValue({ model: 'article' })).toBe('"{""model"":""article""}"');
      expect(escapeCsvValue({ id: 1 })).toBe('"{""id"":1}"');
      expect(escapeCsvValue([1, 2])).toBe('"[1,2]"');
      expect(escapeCsvValue({})).toBe('{}');
    });

    it('serializes dates as ISO strings', () => {
      expect(escapeCsvValue(new Date('2026-09-16T10:20:30.000Z'))).toBe('2026-09-16T10:20:30.000Z');
      expect(escapeCsvValue(new Date('not-a-date'))).toBe('');
    });

    it('returns an empty string for values JSON cannot represent', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      expect(escapeCsvValue(circular)).toBe('');
      expect(escapeCsvValue(() => {})).toBe('');
      expect(escapeCsvValue(Symbol('secret'))).toBe('');
    });

    it('keeps booleans and bigints readable', () => {
      expect(escapeCsvValue(true)).toBe('true');
      expect(escapeCsvValue(false)).toBe('false');
      expect(escapeCsvValue(10n)).toBe('10');
    });
  });

  describe('serializeCsvLine', () => {
    it('joins values with commas and terminates the line with CRLF', () => {
      expect(serializeCsvLine([1, 'entry.update', null])).toBe('1,entry.update,\r\n');
    });
  });
});

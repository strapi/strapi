import { escapeCsvValue, serializeCsvLine } from '../csv';

describe('csv', () => {
  describe('escapeCsvValue', () => {
    it('returns an empty string for null and undefined', () => {
      expect(escapeCsvValue(null)).toBe('');
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
  });

  describe('serializeCsvLine', () => {
    it('joins values with commas and terminates the line with CRLF', () => {
      expect(serializeCsvLine([1, 'entry.update', null])).toBe('1,entry.update,\r\n');
    });
  });
});

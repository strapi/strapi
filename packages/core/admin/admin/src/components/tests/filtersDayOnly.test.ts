import {
  buildDayOnlyOperatorPairing,
  isDayAwareOperator,
  isLocalMidnight,
  normaliseDayOnlyFilter,
  parseISODate,
} from '../filtersDayOnly';

// All date math here runs in the local timezone of the test process.
// We construct Dates using local-time constructors so behaviour is timezone-independent.
const localMidnight = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 0, 0, 0, 0);

const localMidday = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12, 0, 0, 0);

describe('filtersDayOnly', () => {
  describe('isDayAwareOperator', () => {
    it.each(['$eq', '$ne', '$gt', '$gte', '$lt', '$lte'])('accepts %s', (op) => {
      expect(isDayAwareOperator(op)).toBe(true);
    });

    it.each(['$null', '$notNull', '$contains', '$startsWith', ''])('rejects %s', (op) => {
      expect(isDayAwareOperator(op)).toBe(false);
    });
  });

  describe('parseISODate', () => {
    it('returns null for non-string input', () => {
      expect(parseISODate(undefined)).toBeNull();
      expect(parseISODate(42)).toBeNull();
      expect(parseISODate(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseISODate('')).toBeNull();
    });

    it('returns null for unparseable string', () => {
      expect(parseISODate('not a date')).toBeNull();
    });

    it('parses a valid ISO string', () => {
      const result = parseISODate('2026-05-26T00:00:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2026-05-26T00:00:00.000Z');
    });
  });

  describe('isLocalMidnight', () => {
    it('returns true for a Date at local 00:00:00.000', () => {
      expect(isLocalMidnight(localMidnight(2026, 5, 26))).toBe(true);
    });

    it('returns false for non-zero time components', () => {
      expect(isLocalMidnight(new Date(2026, 4, 26, 0, 0, 0, 1))).toBe(false);
      expect(isLocalMidnight(new Date(2026, 4, 26, 0, 0, 1, 0))).toBe(false);
      expect(isLocalMidnight(new Date(2026, 4, 26, 0, 1, 0, 0))).toBe(false);
      expect(isLocalMidnight(new Date(2026, 4, 26, 1, 0, 0, 0))).toBe(false);
      expect(isLocalMidnight(localMidday(2026, 5, 26))).toBe(false);
    });
  });

  describe('buildDayOnlyOperatorPairing', () => {
    const day = localMidnight(2026, 5, 26);
    const dayStartUTC = day.toISOString();
    const dayEndUTC = new Date(localMidnight(2026, 5, 27).getTime() - 1).toISOString();

    it('returns null for non-day-aware operators', () => {
      expect(buildDayOnlyOperatorPairing('$null', day)).toBeNull();
      expect(buildDayOnlyOperatorPairing('$contains', day)).toBeNull();
    });

    it('encodes $eq as $between over the local day', () => {
      expect(buildDayOnlyOperatorPairing('$eq', day)).toEqual({
        $between: [encodeURIComponent(dayStartUTC), encodeURIComponent(dayEndUTC)],
      });
    });

    it('encodes $ne as $not wrapping $between', () => {
      expect(buildDayOnlyOperatorPairing('$ne', day)).toEqual({
        $not: {
          $between: [encodeURIComponent(dayStartUTC), encodeURIComponent(dayEndUTC)],
        },
      });
    });

    it('encodes $gt as $gt of end-of-day so the entire day is excluded', () => {
      expect(buildDayOnlyOperatorPairing('$gt', day)).toEqual({
        $gt: encodeURIComponent(dayEndUTC),
      });
    });

    it('encodes $gte as $gte of day-start (on or after this day)', () => {
      expect(buildDayOnlyOperatorPairing('$gte', day)).toEqual({
        $gte: encodeURIComponent(dayStartUTC),
      });
    });

    it('encodes $lt as $lt of day-start (strictly earlier day)', () => {
      expect(buildDayOnlyOperatorPairing('$lt', day)).toEqual({
        $lt: encodeURIComponent(dayStartUTC),
      });
    });

    it('encodes $lte as $lte of end-of-day (through end of this day)', () => {
      expect(buildDayOnlyOperatorPairing('$lte', day)).toEqual({
        $lte: encodeURIComponent(dayEndUTC),
      });
    });
  });

  describe('normaliseDayOnlyFilter', () => {
    const day = localMidnight(2026, 5, 26);
    const dayStartUTC = day.toISOString();
    const dayEndUTC = new Date(localMidnight(2026, 5, 27).getTime() - 1).toISOString();

    it('returns null for unrelated operators', () => {
      expect(normaliseDayOnlyFilter({ $eq: 'hello' })).toBeNull();
      expect(normaliseDayOnlyFilter({ $contains: 'foo' })).toBeNull();
    });

    it('returns null for an operator object with multiple keys', () => {
      expect(
        normaliseDayOnlyFilter({
          $gte: encodeURIComponent(dayStartUTC),
          $lt: encodeURIComponent(dayEndUTC),
        })
      ).toBeNull();
    });

    it('detects $eq day from $between with matching local-day bounds', () => {
      expect(
        normaliseDayOnlyFilter({
          $between: [encodeURIComponent(dayStartUTC), encodeURIComponent(dayEndUTC)],
        })
      ).toEqual({ operator: '$eq', value: dayStartUTC });
    });

    it('rejects $between whose bounds are not a single local day', () => {
      const dayAfterEndUTC = new Date(localMidnight(2026, 5, 28).getTime() - 1).toISOString();
      expect(
        normaliseDayOnlyFilter({
          $between: [encodeURIComponent(dayStartUTC), encodeURIComponent(dayAfterEndUTC)],
        })
      ).toBeNull();
    });

    it('detects $ne day from $not wrapping $between', () => {
      expect(
        normaliseDayOnlyFilter({
          $not: {
            $between: [encodeURIComponent(dayStartUTC), encodeURIComponent(dayEndUTC)],
          },
        })
      ).toEqual({ operator: '$ne', value: dayStartUTC });
    });

    it('detects $gte day from $gte at local midnight', () => {
      expect(normaliseDayOnlyFilter({ $gte: encodeURIComponent(dayStartUTC) })).toEqual({
        operator: '$gte',
        value: dayStartUTC,
      });
    });

    it('detects $lt day from $lt at local midnight', () => {
      expect(normaliseDayOnlyFilter({ $lt: encodeURIComponent(dayStartUTC) })).toEqual({
        operator: '$lt',
        value: dayStartUTC,
      });
    });

    it('detects $gt day from $gt at end-of-local-day and reports the day-start value', () => {
      expect(normaliseDayOnlyFilter({ $gt: encodeURIComponent(dayEndUTC) })).toEqual({
        operator: '$gt',
        value: dayStartUTC,
      });
    });

    it('detects $lte day from $lte at end-of-local-day and reports the day-start value', () => {
      expect(normaliseDayOnlyFilter({ $lte: encodeURIComponent(dayEndUTC) })).toEqual({
        operator: '$lte',
        value: dayStartUTC,
      });
    });

    it('rejects $gte whose value is not local midnight', () => {
      const midday = localMidday(2026, 5, 26).toISOString();
      expect(normaliseDayOnlyFilter({ $gte: encodeURIComponent(midday) })).toBeNull();
    });

    it('rejects $gt whose value is not the last ms of a local day', () => {
      const midday = localMidday(2026, 5, 26).toISOString();
      expect(normaliseDayOnlyFilter({ $gt: encodeURIComponent(midday) })).toBeNull();
    });
  });

  describe('round-trip', () => {
    const day = localMidnight(2026, 5, 26);

    it.each(['$eq', '$ne', '$gt', '$gte', '$lt', '$lte'] as const)(
      '%s encodes and decodes back to the same operator + day',
      (op) => {
        const encoded = buildDayOnlyOperatorPairing(op, day)!;
        const decoded = normaliseDayOnlyFilter(encoded);
        expect(decoded).toEqual({ operator: op, value: day.toISOString() });
      }
    );
  });
});

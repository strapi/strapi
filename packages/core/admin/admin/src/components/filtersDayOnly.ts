/* -------------------------------------------------------------------------------------------------
 * Day-only datetime filtering helpers
 *
 * When the user picks a datetime attribute and leaves the time half empty, the DateTimePicker
 * emits a Date at local midnight. We treat that as a "filter for the whole calendar day" and
 * expand the user-facing operator into a compound query the backend can answer:
 *
 *   $eq  day → { $between: [dayStart, dayEnd] }
 *   $ne  day → { $not: { $between: [dayStart, dayEnd] } }
 *   $gt  day → { $gt:  dayEnd }
 *   $gte day → { $gte: dayStart }
 *   $lt  day → { $lt:  dayStart }
 *   $lte day → { $lte: dayEnd }
 *
 * Where dayStart and dayEnd are the first / last millisecond of the local day, serialised to UTC.
 * The shape round-trips: normaliseDayOnlyFilter recognises the encoded query and reports the
 * original user-facing operator with the day-start value so the chip + edit popover stay in sync.
 *
 * Trade-off: a user who genuinely wants exact-instant filtering on local midnight will get a
 * day filter instead. The 1-minute workaround is to enter 00:01.
 * -----------------------------------------------------------------------------------------------*/

export type FilterPrimitive = string | string[];
export type FilterClause = Record<string, FilterPrimitive | Record<string, FilterPrimitive>>;

const DAY_AWARE_OPERATORS = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte'] as const;
export type DayAwareOperator = (typeof DAY_AWARE_OPERATORS)[number];

export const isDayAwareOperator = (op: string): op is DayAwareOperator =>
  (DAY_AWARE_OPERATORS as readonly string[]).includes(op);

export const parseISODate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isLocalMidnight = (date: Date): boolean =>
  date.getHours() === 0 &&
  date.getMinutes() === 0 &&
  date.getSeconds() === 0 &&
  date.getMilliseconds() === 0;

const startOfLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const startOfNextLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);

const endOfLocalDay = (date: Date): Date => new Date(startOfNextLocalDay(date).getTime() - 1);

const isLocalMidnightISO = (iso: string): boolean => {
  const d = parseISODate(iso);
  return !!d && isLocalMidnight(d);
};

// True when the ISO points at the last millisecond of some local day (i.e. iso + 1ms is local midnight).
const isLocalEndOfDayISO = (iso: string): boolean => {
  const d = parseISODate(iso);
  if (!d) return false;
  return isLocalMidnight(new Date(d.getTime() + 1));
};

const isSameLocalDayRange = (startISO: string, endISO: string): boolean => {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (!start || !end) return false;
  if (!isLocalMidnight(start)) return false;
  return startOfNextLocalDay(start).getTime() === end.getTime() + 1;
};

// Given a user-facing operator + a day-only Date (local midnight), build the encoded query shape
// stored under the attribute. Returns null when the operator is not day-aware.
export const buildDayOnlyOperatorPairing = (
  operator: string,
  dayDate: Date
): FilterClause | null => {
  if (!isDayAwareOperator(operator)) return null;

  const dayStartISO = startOfLocalDay(dayDate).toISOString();
  const dayEndISO = endOfLocalDay(dayDate).toISOString();

  switch (operator) {
    case '$eq':
      return {
        $between: [encodeURIComponent(dayStartISO), encodeURIComponent(dayEndISO)],
      };
    case '$ne':
      return {
        $not: {
          $between: [encodeURIComponent(dayStartISO), encodeURIComponent(dayEndISO)],
        },
      };
    case '$gt':
      return { $gt: encodeURIComponent(dayEndISO) };
    case '$gte':
      return { $gte: encodeURIComponent(dayStartISO) };
    case '$lt':
      return { $lt: encodeURIComponent(dayStartISO) };
    case '$lte':
      return { $lte: encodeURIComponent(dayEndISO) };
  }
};

// Detect a day-only query shape on a datetime attribute and report it as the original user-facing
// operator + the local-midnight ISO value. Returns null when the shape is not day-only.
export const normaliseDayOnlyFilter = (
  operatorObj: Record<string, unknown>
): { operator: DayAwareOperator; value: string } | null => {
  const keys = Object.keys(operatorObj);
  if (keys.length !== 1) return null;
  const [op] = keys;
  const raw = operatorObj[op];

  if (op === '$between') {
    if (
      Array.isArray(raw) &&
      raw.length === 2 &&
      typeof raw[0] === 'string' &&
      typeof raw[1] === 'string'
    ) {
      const start = decodeURIComponent(raw[0]);
      const end = decodeURIComponent(raw[1]);
      if (isSameLocalDayRange(start, end)) {
        return { operator: '$eq', value: start };
      }
    }
    return null;
  }

  if (op === '$not') {
    if (typeof raw === 'object' && raw !== null) {
      const inner = normaliseDayOnlyFilter(raw as Record<string, unknown>);
      if (inner && inner.operator === '$eq') {
        return { operator: '$ne', value: inner.value };
      }
    }
    return null;
  }

  if ((op === '$gte' || op === '$lt') && typeof raw === 'string') {
    const decoded = decodeURIComponent(raw);
    if (isLocalMidnightISO(decoded)) {
      return { operator: op, value: decoded };
    }
    return null;
  }

  if ((op === '$gt' || op === '$lte') && typeof raw === 'string') {
    const decoded = decodeURIComponent(raw);
    if (isLocalEndOfDayISO(decoded)) {
      const dayStart = startOfLocalDay(new Date(decoded)).toISOString();
      return { operator: op, value: dayStart };
    }
    return null;
  }

  return null;
};

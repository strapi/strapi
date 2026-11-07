import { createHash } from 'node:crypto';

const normalize = (value: unknown): unknown => {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
};

/**
 * Stable hash of a field value: object keys are sorted, dates use their ISO form and
 * `undefined` equals `null`. Only compare hashes of values read through the same path
 * (the Document Service), since the database layer decides the shape of numbers and dates.
 */
export const hashValue = (value: unknown) => {
  return createHash('sha256')
    .update(JSON.stringify(normalize(value)))
    .digest('hex');
};

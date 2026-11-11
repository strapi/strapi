const MAX_INTEGER_ID = 2147483647;

/**
 * Whether a value is a positive integer that fits the 32-bit integer columns used for
 * `id` and `pathId`. Larger values make Postgres reject the query.
 */
export const isIntegerId = (value: unknown) =>
  /^\d+$/.test(String(value)) && Number(value) <= MAX_INTEGER_ID;

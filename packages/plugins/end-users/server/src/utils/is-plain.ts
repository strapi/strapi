/**
 * Whether `value` is an object that is not an array: the shape check for input that is about to be
 * read key by key. A class instance, a `Date` or a `Map` passes; use `isPlainObject` to refuse those.
 */
export const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether `value` is an object literal, or one made with `Object.create(null)`. */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

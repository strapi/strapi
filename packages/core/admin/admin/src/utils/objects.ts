/**
 * @internal
 *
 * @description Checks if the given value is an object
 * with included type guard.
 */
const isObject = (obj: unknown): obj is object => {
  return typeof obj === 'object' && obj !== null && Array.isArray(obj) === false;
};

export { isObject };

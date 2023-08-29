export const PREFIX = '[@strapi/helper-plugin]:';

export const once = <T extends unknown[], R>(fn: (...args: T) => R) => {
  const func = fn;
  let called = false;

  if (typeof func !== 'function') {
    throw new TypeError(`${PREFIX} once requires a function parameter`);
  }

  return (...args: T) => {
    if (!called) {
      func(...args);
      called = true;
    }
  };
};

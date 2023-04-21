export const PREFIX = '[@strapi/helper-plugin]:';

/**
 * @type {<TFunc extends (...args: any) => any>(fn: TFunc) => (...args: any[]) => void}
 */
export const once = (fn) => {
  const func = fn;
  let called = false;

  if (typeof func !== 'function') {
    throw new TypeError(`${PREFIX} once requires a function parameter`);
  }

  return (...args) => {
    if (!called) {
      func(...args);
      called = true;
    }
  };
};

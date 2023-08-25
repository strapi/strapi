export const PREFIX = '[@strapi/helper-plugin]:';

type AnyFunction = (...args: any[]) => any;

export const once = (fn: AnyFunction): AnyFunction => {
  const func = fn;
  let called = false;

  if (typeof func !== 'function') {
    throw new TypeError(`${PREFIX} once requires a function parameter`);
  }

  return (...args: any[]) => {
    if (!called) {
      func(...args);
      called = true;
    }
  };
};

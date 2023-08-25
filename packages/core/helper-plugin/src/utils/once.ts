export const PREFIX = '[@strapi/helper-plugin]:';

export const once = <TFunc extends (...args: any) => any>(fn: TFunc) => {
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

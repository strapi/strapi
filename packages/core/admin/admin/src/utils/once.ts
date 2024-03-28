export const once = <TFunc extends (...args: any) => any>(fn: TFunc) => {
  const func = fn;
  let called = false;

  if (typeof func !== 'function') {
    throw new TypeError(`once requires a function parameter`);
  }

  return (...args: any) => {
    if (!called && process.env.NODE_ENV === 'development') {
      func(...args);
      called = true;
    }
  };
};

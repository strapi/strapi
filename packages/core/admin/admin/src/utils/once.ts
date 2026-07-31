export const once = <TFunc extends (...args: never[]) => unknown>(fn: TFunc) => {
  const func = fn;
  let called = false;

  if (typeof func !== 'function') {
    throw new TypeError(`once requires a function parameter`);
  }

  return (...args: Parameters<TFunc>) => {
    if (!called && process.env.NODE_ENV === 'development') {
      func(...args);
      called = true;
    }
  };
};

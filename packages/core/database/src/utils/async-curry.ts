// lodash/fp curry does not handle async functions properly, and creates very "ugly" types,
// so we will use our own version to ensure curried functions are typed correctly
// TODO: Export this from root @strapi/utils so we don't have copies of it between packages

/**
 * @internal
 */
export const asyncCurry = <Args extends any[], R>(
  fn: (...args: Args) => Promise<R>
): CurriedAsyncFunction<Args, R> => {
  const curried = (...args: any[]): any => {
    if (args.length >= fn.length) {
      return fn(...(args as Args));
    }
    return (...moreArgs: any[]) => curried(...args, ...moreArgs);
  };

  return curried as CurriedAsyncFunction<Args, R>;
};

/**
 * @internal
 */
export type CurriedAsyncFunction<Args extends any[], R> = Args extends [infer First, ...infer Rest]
  ? Rest extends []
    ? (arg: First) => Promise<R>
    : (arg: First) => CurriedAsyncFunction<Rest, R>
  : () => Promise<R>;

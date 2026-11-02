import type {
  CurriedFunction1,
  CurriedFunction2,
  CurriedFunction3,
  CurriedFunction4,
  CurriedFunction5,
} from 'lodash';

type AnyFunction = (...args: any[]) => any;

// Same call signatures as lodash's `curry`, returning lodash's curried types, so the
// declarations of everything curried with it are unchanged.
interface Curry {
  <T1, R>(fn: (t1: T1) => R, arity?: number): CurriedFunction1<T1, R>;
  <T1, T2, R>(fn: (t1: T1, t2: T2) => R, arity?: number): CurriedFunction2<T1, T2, R>;
  <T1, T2, T3, R>(
    fn: (t1: T1, t2: T2, t3: T3) => R,
    arity?: number
  ): CurriedFunction3<T1, T2, T3, R>;
  <T1, T2, T3, T4, R>(
    fn: (t1: T1, t2: T2, t3: T3, t4: T4) => R,
    arity?: number
  ): CurriedFunction4<T1, T2, T3, T4, R>;
  <T1, T2, T3, T4, T5, R>(
    fn: (t1: T1, t2: T2, t3: T3, t4: T4, t5: T5) => R,
    arity?: number
  ): CurriedFunction5<T1, T2, T3, T4, T5, R>;
  (fn: AnyFunction, arity?: number): AnyFunction;
}

/**
 * Curries `fn` by closing over the arguments supplied so far.
 *
 * Used instead of lodash `curry` for functions that are partially applied on every
 * request, such as the query traversals (`traverseQueryPopulate(visitor, ctx)`). On every
 * partial call lodash builds a new wrapper and derives its `toString` by stringifying the
 * whole source of the curried function and running regexes over it, which showed up as a
 * significant share of request CPU.
 *
 * Behaves like lodash `curry` otherwise: `fn` is called as soon as at least `arity`
 * arguments have been supplied (any extra ones are passed along), and `arity` defaults to
 * `fn.length`. Placeholders are not supported.
 */
export const curry: Curry = (fn: AnyFunction, arity: number = fn.length): AnyFunction => {
  const curried: AnyFunction = (...args) => {
    if (args.length >= arity) {
      return fn(...args);
    }

    return (...rest: unknown[]) => curried(...args, ...rest);
  };

  return curried;
};

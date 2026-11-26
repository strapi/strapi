import { afterEach, describe, expect, it, vi } from 'vitest';
import { curry as lodashCurry } from 'lodash';

import { curry } from '../curry';
import {
  traverseQueryFields,
  traverseQueryFilters,
  traverseQueryPopulate,
  traverseQuerySort,
} from '../traverse';
import traverseEntity from '../traverse-entity';
import * as sanitizers from '../sanitize/sanitizers';
import { map } from '../async';

describe('curry', () => {
  const add = (a: number, b: number, c: number) => a + b + c;

  it('calls the function when every argument is supplied at once', () => {
    expect(curry(add)(1, 2, 3)).toBe(6);
  });

  it('accepts the arguments over several partial calls', () => {
    const curried = curry(add);

    expect(curried(1)(2)(3)).toBe(6);
    expect(curried(1, 2)(3)).toBe(6);
    expect(curried(1)(2, 3)).toBe(6);
  });

  it('keeps waiting when called with no arguments', () => {
    expect(curry(add)()(1)()(2, 3)).toBe(6);
  });

  it('does not share arguments between branches of the same partial', () => {
    const addOne = curry(add)(1);
    const addOneTwo = addOne(2);

    expect(addOne(10)(20)).toBe(31);
    expect(addOneTwo(3)).toBe(6);
    expect(addOneTwo(4)).toBe(7);
    expect(addOne(2, 3)).toBe(6);
  });

  it('calls the function only once the arity is reached', () => {
    const fn = vi.fn(add);
    const curried = curry(fn);

    curried(1)(2);
    expect(fn).not.toHaveBeenCalled();

    curried(1)(2)(3);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1, 2, 3);
  });

  it('passes on arguments beyond the arity', () => {
    // `fn.length` stops at the first default parameter, so this has an arity of 2 and a
    // third argument is optional. `async.map(items, mapper, { concurrency })` relies on it.
    const withOptions = (a: number, b: number, options: { scale: number } = { scale: 1 }) =>
      (a + b) * options.scale;
    const curried = curry(withOptions);

    expect(curried(1, 2)).toBe(3);
    expect(curried(1)(2)).toBe(3);
    expect(curried(1, 2, { scale: 10 })).toBe(30);
    expect(curried(1)(2, { scale: 10 })).toBe(30);
  });

  it('accepts an explicit arity', () => {
    const variadic = (...args: number[]) => args;
    const curried = curry(variadic, 2);

    expect(curried(1)(2)).toEqual([1, 2]);
    expect(curried(1, 2, 3)).toEqual([1, 2, 3]);
  });

  it('returns the promise of an asynchronous function untouched', async () => {
    const addAsync = async (a: number, b: number) => a + b;

    await expect(curry(addAsync)(1)(2)).resolves.toBe(3);
  });

  it('returns the same results as lodash curry for every call shape', () => {
    const collect = (a: unknown, b: unknown, c: unknown, ...rest: unknown[]) => [a, b, c, ...rest];
    const ours = curry(collect);
    const theirs = lodashCurry(collect);

    const shapes: Array<(fn: any) => unknown> = [
      (fn) => fn('a', 'b', 'c'),
      (fn) => fn('a')('b')('c'),
      (fn) => fn('a', 'b')('c'),
      (fn) => fn('a')('b', 'c'),
      (fn) => fn()('a')()('b', 'c'),
      (fn) => fn('a', 'b', 'c', 'd'),
      (fn) => fn('a')('b', 'c', 'd', 'e'),
      (fn) => fn(undefined, null)(undefined),
    ];

    for (const shape of shapes) {
      expect(shape(ours)).toEqual(shape(theirs));
    }

    expect(typeof ours('a', 'b')).toBe(typeof theirs('a', 'b'));
  });

  it('does not stringify the function on a partial call', () => {
    const fn = (a: number, b: number) => a + b;
    const toString = vi.fn(() => 'source');
    Object.defineProperty(fn, 'toString', { value: toString });

    const curried = curry(fn);

    expect(curried(1)(2)).toBe(3);
    expect(toString).not.toHaveBeenCalled();
  });
});

describe('curried exports', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * lodash `curry` builds a new wrapper on every partial call and derives that wrapper's
   * `toString` by stringifying the source of the curried function. These exports are
   * partially applied on every request (`traverseQueryPopulate(visitor, ctx)` and so on),
   * so none of them may stringify a function when they are partially applied.
   */
  const partialCalls: Record<string, () => unknown> = {
    traverseQueryPopulate: () => traverseQueryPopulate(() => {}, {} as any),
    traverseQueryFilters: () => traverseQueryFilters(() => {}, {} as any),
    traverseQuerySort: () => traverseQuerySort(() => {}, {} as any),
    traverseQueryFields: () => traverseQueryFields(() => {}, {} as any),
    traverseEntity: () => traverseEntity(() => {}, {} as any),
    defaultSanitizeFilters: () => sanitizers.defaultSanitizeFilters({} as any),
    defaultSanitizeSort: () => sanitizers.defaultSanitizeSort({} as any),
    defaultSanitizeFields: () => sanitizers.defaultSanitizeFields({} as any),
    defaultSanitizePopulate: () => sanitizers.defaultSanitizePopulate({} as any),
    'async.map': () => map([]),
  };

  it.each(Object.keys(partialCalls))(
    '%s does not stringify a function when partially applied',
    (name) => {
      const toString = vi.spyOn(Function.prototype, 'toString');

      const partial = partialCalls[name]();
      const calls = toString.mock.calls.length;

      toString.mockRestore();

      expect(typeof partial).toBe('function');
      expect(calls).toBe(0);
    }
  );
});

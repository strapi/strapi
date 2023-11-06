import pMap from 'p-map';
import { curry } from 'lodash/fp';

type AnyFunc = (...args: any) => any;

/*
 NOTE: This type is here to enforce piped functions have the right input/output types
 For a list of functions it will return a new list of function but will answer the return type of the previous is the arg type of the next function
*/
type PipeArgs<F extends AnyFunc[], PrevReturn = Parameters<F[0]>[0]> = F extends [
  (arg: any) => infer B
]
  ? [(arg: PrevReturn) => B]
  : F extends [(arg: any) => infer B, ...infer Tail]
  ? Tail extends AnyFunc[]
    ? [(arg: PrevReturn) => B, ...PipeArgs<Tail, B>]
    : []
  : [];

export function pipeAsync<F extends AnyFunc[], FirstFn extends F[0]>(
  ...fns: PipeArgs<F> extends F ? F : PipeArgs<F>
) {
  type Args = Parameters<FirstFn>;
  type ReturnT = F extends [...AnyFunc[], (...arg: any) => infer R]
    ? R extends Promise<infer InnerType>
      ? InnerType
      : R
    : never;

  const [firstFn, ...fnRest] = fns;

  return async (...args: Args): Promise<ReturnT> => {
    let res: ReturnT = await firstFn.apply(firstFn, args);

    for (let i = 0; i < fnRest.length; i += 1) {
      res = await fnRest[i](res);
    }

    return res;
  };
}

export const mapAsync = curry(pMap);

export const reduceAsync =
  (mixedArray: any[]) =>
  async <T>(iteratee: AnyFunc, initialValue?: T) => {
    let acc = initialValue;
    for (let i = 0; i < mixedArray.length; i += 1) {
      acc = await iteratee(acc, await mixedArray[i], i);
    }
    return acc;
  };

export const forEachAsync = async <T, R>(
  array: T[],
  func: pMap.Mapper<T, R>,
  options: pMap.Options
) => {
  await pMap(array, func, options);
};

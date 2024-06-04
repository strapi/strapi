import pMap from 'p-map';
import { curry } from 'lodash/fp';

type AnyFunc<TA extends any[] = any[], TR = any> = (...args: TA) => TR;

type MakeProm<T> = Promise<T extends PromiseLike<infer I> ? I : T>;

type PipedFunc<T extends AnyFunc[]> =
  PipeReturn<T> extends never ? never : (...args: Parameters<T[0]>) => PipeReturn<T>;

type PipeReturn<F extends AnyFunc[]> = MakeProm<ReturnType<F[0]>>;

export function pipe<T extends AnyFunc[]>(...fns: PipeReturn<T> extends never ? never : T) {
  const [firstFn, ...fnRest] = fns;

  return (async (...args: any[]) => {
    let res = await firstFn.apply(firstFn, args);

    for (let i = 0; i < fnRest.length; i += 1) {
      res = await fnRest[i](res);
    }

    return res;
  }) as PipedFunc<T>;
}

export const map = curry(pMap);

export const reduce =
  (mixedArray: any[]) =>
  async <T>(iteratee: AnyFunc, initialValue?: T) => {
    let acc = initialValue;
    for (let i = 0; i < mixedArray.length; i += 1) {
      acc = await iteratee(acc, await mixedArray[i], i);
    }
    return acc;
  };
